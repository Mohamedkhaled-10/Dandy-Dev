// Temporary one-time script for DANDY admin@dandy.com Firebase Auth email verification.
// Default mode is read-only dry-run. Apply requires both --apply and --confirm-email=admin@dandy.com.
// Remove this script immediately after completing and verifying the one-time operation.

import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const TARGET_ADMIN_EMAIL = 'admin@dandy.com';
const EXPECTED_PROJECT_ID = 'dandy-562fc';
const EXPECTED_DATABASE_URL = 'https://dandy-562fc-default-rtdb.europe-west1.firebasedatabase.app';

function printResult(payload, exitCode = 0) {
  console.log(JSON.stringify(payload, null, 2));
  process.exitCode = exitCode;
}

function parseCliArgs(argv) {
  if (!Array.isArray(argv) || argv.length === 0) {
    return { valid: true, mode: 'dry-run' };
  }

  let hasApply = false;
  let confirmEmail = null;

  for (const arg of argv) {
    if (arg === '--apply') {
      if (hasApply) {
        return {
          valid: false,
          error: 'DUPLICATE_ARGUMENT',
          message: 'Duplicate --apply flag is not allowed.'
        };
      }
      hasApply = true;
    } else if (arg.startsWith('--confirm-email=')) {
      if (confirmEmail !== null) {
        return {
          valid: false,
          error: 'DUPLICATE_ARGUMENT',
          message: 'Duplicate --confirm-email flag is not allowed.'
        };
      }
      confirmEmail = arg.slice('--confirm-email='.length);
    } else {
      return {
        valid: false,
        error: 'UNEXPECTED_ARGUMENT',
        message: 'Only dry-run (no arguments) or --apply --confirm-email=admin@dandy.com are supported.'
      };
    }
  }

  if (!hasApply || confirmEmail === null) {
    return {
      valid: false,
      error: 'EXPLICIT_CONFIRMATION_REQUIRED',
      message: 'Apply mode requires both --apply and --confirm-email=admin@dandy.com.'
    };
  }

  if (confirmEmail.trim().toLowerCase() !== TARGET_ADMIN_EMAIL) {
    return {
      valid: false,
      error: 'CONFIRM_EMAIL_MISMATCH',
      message: 'Confirmation email does not match the hardcoded target admin@dandy.com.'
    };
  }

  return { valid: true, mode: 'apply' };
}

function loadAndValidateServiceAccount() {
  const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawEnv || typeof rawEnv !== 'string' || !rawEnv.trim()) {
    return {
      valid: false,
      error: 'MISSING_CREDENTIALS',
      message: 'FIREBASE_SERVICE_ACCOUNT environment variable is not set.'
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawEnv);
  } catch {
    return {
      valid: false,
      error: 'INVALID_CREDENTIALS_JSON',
      message: 'FIREBASE_SERVICE_ACCOUNT is not valid JSON.'
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      error: 'INVALID_CREDENTIALS_SHAPE',
      message: 'FIREBASE_SERVICE_ACCOUNT must be a JSON object.'
    };
  }

  const normalizedKey =
    typeof parsed.private_key === 'string'
      ? parsed.private_key.replace(/\\n/g, '\n')
      : '';

  const hasRequiredFields =
    parsed.type === 'service_account' &&
    typeof parsed.project_id === 'string' &&
    parsed.project_id.trim().length > 0 &&
    typeof parsed.client_email === 'string' &&
    parsed.client_email.includes('@') &&
    normalizedKey.includes('BEGIN') &&
    normalizedKey.includes('PRIVATE KEY');

  if (!hasRequiredFields) {
    return {
      valid: false,
      error: 'MISSING_SERVICE_ACCOUNT_FIELDS',
      message: 'FIREBASE_SERVICE_ACCOUNT is missing required service-account fields.'
    };
  }

  if (parsed.project_id.trim() !== EXPECTED_PROJECT_ID) {
    return {
      valid: false,
      error: 'PROJECT_MISMATCH',
      message: `Service account project_id does not match expected project (${EXPECTED_PROJECT_ID}).`
    };
  }

  return {
    valid: true,
    serviceAccount: {
      ...parsed,
      private_key: normalizedKey
    }
  };
}

async function resolveAdminAuth(validatedServiceAccount) {
  // Prefer reusing src/utils/firebase-admin.ts when supported by the Node.js runtime
  try {
    const firebaseAdminMod = await import('../src/utils/firebase-admin.ts');
    if (
      firebaseAdminMod &&
      typeof firebaseAdminMod.getAdminApp === 'function' &&
      typeof firebaseAdminMod.getAdminAuth === 'function'
    ) {
      const app = firebaseAdminMod.getAdminApp();
      if (app?.options?.databaseURL !== EXPECTED_DATABASE_URL) {
        throw new Error('DATABASE_URL_MISMATCH');
      }
      return {
        adminAuth: firebaseAdminMod.getAdminAuth(),
        initializationSource: 'src/utils/firebase-admin.ts'
      };
    }
  } catch (err) {
    if (err?.message === 'DATABASE_URL_MISMATCH') {
      throw err;
    }
    // Fall back cleanly if direct .ts import is unsupported on this runtime
  }

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert(validatedServiceAccount),
          databaseURL: EXPECTED_DATABASE_URL
        });

  if (app?.options?.databaseURL !== EXPECTED_DATABASE_URL) {
    throw new Error('DATABASE_URL_MISMATCH');
  }

  return {
    adminAuth: getAuth(app),
    initializationSource: 'standalone-firebase-admin'
  };
}

async function fetchAndValidateTargetAccount(adminAuth) {
  let user;
  try {
    user = await adminAuth.getUserByEmail(TARGET_ADMIN_EMAIL);
  } catch (err) {
    const code = err?.code || 'AUTH_LOOKUP_FAILED';
    if (code === 'auth/user-not-found') {
      return {
        ok: false,
        error: 'ACCOUNT_NOT_FOUND',
        message: `Target account ${TARGET_ADMIN_EMAIL} does not exist in Firebase Authentication.`
      };
    }
    return {
      ok: false,
      error: code,
      message: 'Failed to inspect target account in Firebase Authentication.'
    };
  }

  const normalizedEmail = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
  if (!user || normalizedEmail !== TARGET_ADMIN_EMAIL) {
    return {
      ok: false,
      error: 'TARGET_EMAIL_MISMATCH',
      message: 'Retrieved Firebase Authentication user email does not match target.'
    };
  }

  if (typeof user.uid !== 'string' || !user.uid.trim()) {
    return {
      ok: false,
      error: 'MISSING_UID',
      message: 'Retrieved Firebase Authentication user has no valid UID.'
    };
  }

  if (user.disabled === true) {
    return {
      ok: false,
      error: 'ACCOUNT_DISABLED',
      message: 'Target account is disabled; refusing modification.'
    };
  }

  return { ok: true, user };
}

async function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  if (!cli.valid) {
    printResult(
      {
        success: false,
        mode: 'invalid-args',
        projectIdExpected: EXPECTED_PROJECT_ID,
        target: TARGET_ADMIN_EMAIL,
        error: cli.error,
        message: cli.message,
        databaseWrites: 0
      },
      1
    );
    return;
  }

  const credCheck = loadAndValidateServiceAccount();
  if (!credCheck.valid) {
    printResult(
      {
        success: false,
        mode: cli.mode,
        projectIdExpected: EXPECTED_PROJECT_ID,
        target: TARGET_ADMIN_EMAIL,
        error: credCheck.error,
        message: credCheck.message,
        databaseWrites: 0
      },
      1
    );
    return;
  }

  let adminAuth;
  try {
    const resolved = await resolveAdminAuth(credCheck.serviceAccount);
    adminAuth = resolved.adminAuth;
  } catch (err) {
    printResult(
      {
        success: false,
        mode: cli.mode,
        projectIdExpected: EXPECTED_PROJECT_ID,
        target: TARGET_ADMIN_EMAIL,
        error: err?.message === 'DATABASE_URL_MISMATCH' ? 'DATABASE_URL_MISMATCH' : (err?.code || 'ADMIN_INIT_FAILED'),
        message: 'Failed to initialize Firebase Admin safely.',
        databaseWrites: 0
      },
      1
    );
    return;
  }

  const lookup = await fetchAndValidateTargetAccount(adminAuth);
  if (!lookup.ok) {
    printResult(
      {
        success: false,
        mode: cli.mode,
        projectId: EXPECTED_PROJECT_ID,
        target: TARGET_ADMIN_EMAIL,
        accountFound: lookup.error !== 'ACCOUNT_NOT_FOUND',
        error: lookup.error,
        message: lookup.message,
        databaseWrites: 0
      },
      1
    );
    return;
  }

  const existingUser = lookup.user;
  const emailVerifiedBefore = existingUser.emailVerified === true;

  if (cli.mode === 'dry-run') {
    printResult({
      success: true,
      mode: 'dry-run',
      projectId: EXPECTED_PROJECT_ID,
      target: TARGET_ADMIN_EMAIL,
      accountFound: true,
      emailVerifiedBefore,
      disabled: existingUser.disabled === true,
      wouldUpdate: !emailVerifiedBefore,
      alreadyVerified: emailVerifiedBefore,
      databaseWrites: 0
    });
    return;
  }

  // Apply mode — idempotent if already verified
  if (emailVerifiedBefore) {
    printResult({
      success: true,
      mode: 'apply',
      projectId: EXPECTED_PROJECT_ID,
      target: TARGET_ADMIN_EMAIL,
      accountFound: true,
      emailVerifiedBefore: true,
      emailVerifiedAfter: true,
      disabled: existingUser.disabled === true,
      updated: false,
      alreadyVerified: true,
      message: 'Account emailVerified is already true; no modification performed.',
      databaseWrites: 0
    });
    return;
  }

  const originalUid = existingUser.uid;
  const originalDisabled = existingUser.disabled === true;

  try {
    await adminAuth.updateUser(originalUid, { emailVerified: true });
  } catch (err) {
    printResult(
      {
        success: false,
        mode: 'apply',
        projectId: EXPECTED_PROJECT_ID,
        target: TARGET_ADMIN_EMAIL,
        error: err?.code || 'UPDATE_USER_FAILED',
        message: 'Firebase Auth updateUser failed safely.',
        databaseWrites: 0
      },
      1
    );
    return;
  }

  // Post-update verification by original UID
  let verifiedUser;
  try {
    verifiedUser = await adminAuth.getUser(originalUid);
  } catch (err) {
    printResult(
      {
        success: false,
        mode: 'apply',
        projectId: EXPECTED_PROJECT_ID,
        target: TARGET_ADMIN_EMAIL,
        error: err?.code || 'POST_UPDATE_FETCH_FAILED',
        message: 'Post-update verification lookup failed.',
        databaseWrites: 0
      },
      1
    );
    return;
  }

  const verifiedEmail =
    typeof verifiedUser?.email === 'string' ? verifiedUser.email.trim().toLowerCase() : '';
  const uidUnchanged = verifiedUser?.uid === originalUid;
  const emailUnchanged = verifiedEmail === TARGET_ADMIN_EMAIL;
  const emailVerifiedAfter = verifiedUser?.emailVerified === true;
  const disabledUnchanged = (verifiedUser?.disabled === true) === originalDisabled;

  if (!uidUnchanged || !emailUnchanged || !emailVerifiedAfter || !disabledUnchanged) {
    printResult(
      {
        success: false,
        mode: 'apply',
        projectId: EXPECTED_PROJECT_ID,
        target: TARGET_ADMIN_EMAIL,
        error: 'POST_UPDATE_VERIFICATION_FAILED',
        uidUnchanged,
        emailUnchanged,
        emailVerifiedAfter,
        disabledUnchanged,
        databaseWrites: 0
      },
      1
    );
    return;
  }

  printResult({
    success: true,
    mode: 'apply',
    projectId: EXPECTED_PROJECT_ID,
    target: TARGET_ADMIN_EMAIL,
    uidUnchanged: true,
    emailVerifiedBefore: false,
    emailVerifiedAfter: true,
    disabled: verifiedUser.disabled === true,
    updated: true,
    alreadyVerified: false,
    databaseWrites: 0
  });
}

main().catch((err) => {
  printResult(
    {
      success: false,
      mode: 'error',
      projectIdExpected: EXPECTED_PROJECT_ID,
      target: TARGET_ADMIN_EMAIL,
      error: err?.code || 'UNEXPECTED_ERROR',
      message: 'Unexpected execution failure.',
      databaseWrites: 0
    },
    1
  );
});
