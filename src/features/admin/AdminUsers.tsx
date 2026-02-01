import { useState, useEffect } from 'react';
import { api, User, UserRole } from '@/lib/api';
import { Users, Search, Filter, RefreshCw, Shield, UserCog, Mail, Calendar, CheckCircle, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const roleOptions: UserRole[] = ['USER', 'AGENT', 'DEALER', 'ADMIN'];

const RoleBadge = ({ role }: { role: UserRole }) => {
  const colors: Record<UserRole, string> = {
    'USER': 'bg-gray-100 text-gray-600 border-gray-200',
    'AGENT': 'bg-blue-100 text-blue-700 border-blue-200',
    'DEALER': 'bg-purple-100 text-purple-700 border-purple-200',
    'ADMIN': 'bg-red-100 text-red-700 border-red-200'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[role]} shadow-sm flex items-center gap-1.5 w-fit`}>
      <Shield className="w-3 h-3" />
      {role}
    </span>
  );
};

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <RefreshCw className="w-10 h-10 animate-spin mb-4 text-blue-500/50" />
        <p className="font-medium">Loading User Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            User Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Oversee {users.length} registered accounts and manage permissions.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-blue-600 transition-all font-medium shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterRole('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterRole === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                All
              </button>
              {roleOptions.map(role => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filterRole === role ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User Identity</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Access Level</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined Date</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                    className="group hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500 font-mono">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setNewRole(user.role);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold group-hover:shadow-md"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        Modify Role
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                        <Search className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="font-medium">No users found</p>
                      <p className="text-xs text-gray-400">Try adjusting your search filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UserCog className="w-6 h-6 text-blue-600" />
                Update Permissions
              </h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Close</span>
                <Users className="w-5 h-5 opacity-0" /> {/* Spacer */}
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 font-bold">
                  {editingUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{editingUser.name}</p>
                  <p className="text-xs text-gray-500">{editingUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 pl-1">
                <span>Current Role:</span>
                <RoleBadge role={editingUser.role} />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select New Role</label>
              <div className="space-y-2">
                {roleOptions.map((role) => (
                  <label
                    key={role}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${newRole === role
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${newRole === role ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                        }`}>
                        {newRole === role && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={`font-bold ${newRole === role ? 'text-blue-900' : 'text-gray-600'}`}>
                        {role}
                      </span>
                    </div>
                    {newRole === role && <CheckCircle className="w-4 h-4 text-blue-600" />}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
