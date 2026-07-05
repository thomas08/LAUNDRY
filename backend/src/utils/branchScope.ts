import { User } from '../models/user';

// ขอบเขตสาขาที่ผู้ใช้เข้าถึงได้ สำหรับ scope query ให้ปลอดภัย (backend enforce จริง)
//   'all'  = superadmin เห็นทุกสาขา
//   array  = admin เห็น branchIds ของตัวเอง, user เห็นแค่ branchId หลัก
export type BranchScope = string[] | 'all';

export function branchScopeFor(user: User): BranchScope {
  if (user.role === 'superadmin') return 'all';
  if (user.role === 'admin') return user.branchIds || [];
  return user.branchId ? [user.branchId] : [];
}

// เช็คว่าผู้ใช้เข้าถึงสาขานี้ได้ไหม (ใช้ตอน create/update ที่ระบุ branchId)
export function canUseBranch(user: User, branchId: string): boolean {
  const scope = branchScopeFor(user);
  return scope === 'all' || scope.includes(branchId);
}
