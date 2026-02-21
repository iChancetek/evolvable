/* ===== Role-Based Access Control ===== */

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'end-user';

export type Permission =
    | 'project:create'
    | 'project:edit'
    | 'project:view'
    | 'project:delete'
    | 'project:deploy'
    | 'users:manage'
    | 'settings:edit'
    | 'dashboard:view'
    | 'builder:use';

/* Permission matrix — what each role can do */
const permissionMatrix: Record<UserRole, Permission[]> = {
    owner: [
        'project:create', 'project:edit', 'project:view', 'project:delete',
        'project:deploy', 'users:manage', 'settings:edit', 'dashboard:view', 'builder:use',
    ],
    admin: [
        'project:create', 'project:edit', 'project:view',
        'project:deploy', 'users:manage', 'settings:edit', 'dashboard:view', 'builder:use',
    ],
    editor: [
        'project:create', 'project:edit', 'project:view',
        'dashboard:view', 'builder:use',
    ],
    viewer: [
        'project:view', 'dashboard:view',
    ],
    'end-user': [
        'project:view',
    ],
};

/* Role hierarchy — higher index = more permissions */
const roleHierarchy: UserRole[] = ['end-user', 'viewer', 'editor', 'admin', 'owner'];

export function hasPermission(role: UserRole, permission: Permission): boolean {
    return permissionMatrix[role]?.includes(permission) ?? false;
}

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return roleHierarchy.indexOf(userRole) >= roleHierarchy.indexOf(requiredRole);
}

export function getDefaultRole(): UserRole {
    return 'owner'; // First user of their own project is always owner
}
