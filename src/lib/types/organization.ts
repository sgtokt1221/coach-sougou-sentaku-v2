/**
 * 塾 (organization) エンティティ。
 *
 * 1 塾 = 1 organization。 親 admin (= 代表) が 1 名、 子 admin が 0+。
 * teacher / student は organizationId で塾に紐付く。
 *
 * 既存の managedBy ベースのスコープは並列維持。 同じ organization のメンバー
 * 同士は互いの担当生徒を見られる (scopeByOrganization ヘルパー経由)。
 */
export interface Organization {
  id: string;
  /** 塾名 (例: "つくばゼミナール") */
  name: string;
  /** 親 admin (= 塾の代表) の uid */
  ownerAdminUid: string;
  /** 子 admin 含む全メンバー admin の uid 一覧 (ownerAdminUid も含む) */
  memberAdminUids: string[];
  /** 作成日時 (ISO) */
  createdAt: string;
}

/** 一覧用の軽量型 (= /api/superadmin/organizations のレスポンス) */
export interface OrganizationListItem {
  id: string;
  name: string;
  ownerAdminUid: string;
  ownerAdminName: string;
  memberCount: number;
  studentCount: number;
  teacherCount: number;
  createdAt: string;
}
