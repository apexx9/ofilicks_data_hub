import { useState, useEffect } from 'react';
import { api, User, UserRole } from '@/lib/api';

const roleOptions: UserRole[] = ['USER', 'AGENT', 'DEALER', 'ADMIN'];
const roleColors: Record<UserRole, string> = {
  USER: 'bg-gray-100 text-gray-700',
  AGENT: 'bg-blue-100 text-blue-700',
  DEALER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
};

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('USER');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { users: data } = await api.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;

    try {
      await api.updateUserRole(editingUser.id, newRole);
      await loadUsers();
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update user role');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Manage Users</h2>
        <p className="text-sm text-gray-600 mt-1">{users.length} total users</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Role</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Joined</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${roleColors[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setNewRole(user.role);
                    }}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Change Role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Change User Role</h2>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-1">User</p>
              <p className="font-semibold text-gray-900">{editingUser.name}</p>
              <p className="text-sm text-gray-600">{editingUser.email}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">New Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
