/** 退塾の理由（生徒詳細の退塾モーダルと API で共用する正本） */
export const WITHDRAW_REASONS = ["合格・進学", "退塾", "その他"] as const;
export type WithdrawReason = (typeof WITHDRAW_REASONS)[number];
