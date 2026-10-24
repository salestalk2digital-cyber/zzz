import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { RoleBadge, OutletBadge } from '../components/common/Badge.tsx';
import type { User, UserRole, OutletId } from '../types/index.ts';
import { ShieldCheck, UserPlus, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export const UsersView: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create user form
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('gurgaon_team');
  const [outletId, setOutletId] = useState<OutletId | 'all'>('gurgaon');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      await api.createUser({
        name,
        username,
        email,
        role,
        outletId: role === 'gurgaon_team' ? 'gurgaon' : role === 'faridabad_team' ? 'faridabad' : outletId,
        password,
        phone,
      });

      setShowModal(false);
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setPhone('');
      await fetchUsers();
      alert('User account created successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating user');
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.updateUser(u.id, { active: !u.active });
      await fetchUsers();
    } catch (err: any) {
      alert(`Error updating user: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#302A28]">Users & Permissions Management</h1>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Supreme Ads Agency Superadmin Console • RBAC role & outlet allocation (No public registration)
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create User Account</span>
        </button>
      </div>

      <div className="bg-white border border-[#F0E4DF] rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FFF9F6] border-b border-[#F0E4DF] text-[#7B706B] font-bold text-[11px]">
            <tr>
              <th className="px-5 py-3">User Name & Username</th>
              <th className="px-4 py-3">Assigned Role</th>
              <th className="px-4 py-3">Outlet Authorization</th>
              <th className="px-4 py-3">Email Address</th>
              <th className="px-4 py-3">Account Status</th>
              <th className="px-4 py-3">Created / Last Login</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F0E4DF]/60">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#7B706B]">Loading authorized users...</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-[#FFF9F6] transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#302A28]">
                    <div>{u.name}</div>
                    <span className="text-[10px] text-[#7B706B] font-mono font-normal">@{u.username}</span>
                  </td>
                  <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3.5"><OutletBadge outletId={u.outletId || 'all'} /></td>
                  <td className="px-4 py-3.5 text-[#7B706B]">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.active ? 'bg-[#EBF7F0] text-[#2E8B65]' : 'bg-[#FEECEB] text-[#D9534F]'
                    }`}>
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#7B706B]">
                    <div>{new Date(u.createdAt).toLocaleDateString()}</div>
                    <span className="text-[10px]">{u.lastLogin ? `Last login: ${new Date(u.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Never logged in'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                          u.active
                            ? 'border-[#D9534F]/30 text-[#D9534F] hover:bg-[#FEECEB]'
                            : 'border-[#2E8B65]/30 text-[#2E8B65] hover:bg-[#EBF7F0]'
                        }`}
                      >
                        {u.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-[#F0E4DF] shadow-xl space-y-4 text-xs">
            <h4 className="text-base font-bold text-[#302A28]">Create New System User</h4>

            {errorMessage && (
              <div className="p-3 bg-[#FEECEB] border border-[#D9534F]/30 rounded-xl text-[#D9534F]">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikas Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="vikas_ggn"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="vikas@zigzagzoh.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Temporary password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">System Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl"
                  >
                    <option value="supreme_ads_owner">Supreme Ads Owner</option>
                    <option value="client_admin">Client Admin</option>
                    <option value="manager">Manager</option>
                    <option value="gurgaon_team">Gurgaon Team</option>
                    <option value="faridabad_team">Faridabad Team</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#302A28] mb-1">Outlet Allocation</label>
                  <select
                    value={outletId}
                    onChange={(e) => setOutletId(e.target.value as any)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl"
                  >
                    <option value="all">All Outlets (Both GUR & FBD)</option>
                    <option value="gurgaon">Gurgaon Center</option>
                    <option value="faridabad">Faridabad Center</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#F0E4DF] text-[#7B706B] rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl shadow-xs"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
