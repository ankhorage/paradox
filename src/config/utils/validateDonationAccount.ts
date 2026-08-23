export function validateDonationAccount(account: string): string {
  if (!githubAccountPattern.test(account)) {
    throw new Error(
      `Invalid donation account "${account}". Expected a GitHub account login containing only alphanumeric characters or single hyphens.`,
    );
  }

  return account;
}

const githubAccountPattern = /^(?!-)(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
