export const INVITATION_ERROR_MESSAGES = {
  expired: {
    title: 'Invitation Expired',
    description: 'This invitation link has expired. Invitation links are valid for 7 days.',
  },
  invalid: {
    title: 'Invalid Invitation',
    description: 'This invitation link is invalid or has been revoked by the organization admin.',
  },
  declined: {
    title: 'Invitation Declined',
    description:
      'You have declined this invitation. It will be removed when the invitation expires.',
  },
  forbidden: {
    title: 'Invitation Forbidden',
    description: 'This invitation is not for you. Please contact the organization admin.',
  },
} as const
