export const UserActions = { Drop: 'Drop', Claim: 'Claim' } as const;
export type UserAction = typeof UserActions[keyof typeof UserActions];
