import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { RoleBadge, OutletBadge } from '../components/common/Badge.tsx';
import type { User, UserRole, OutletId } from '../types/index.ts';
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  KeyRound,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  User as UserIcon,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create user form modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('gurgaon_team');
  const [outletId, setOutletId] = useState<OutletId | 'all'>('gurgaon');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');

  // Success credentials modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    username: string;
    password: string;
    role: UserRole;
    email: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Password reset modal
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Table password reveal state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

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

  // Real-time username uniqueness checker
  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus('invalid');
      return;
    }

    // Check against local list first
    const localMatch = users.some((u) => u.username.toLowerCase() === clean);
    if (localMatch) {
      setUsernameStatus('taken');
      return;
    }

    // Check with backend
    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const res = await api.checkUsernameAvailable(clean);
        setUsernameStatus(res.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('available');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, users]);

  const handleGeneratePassword = () => {
    const prefixes = ['Zz', 'Team', 'CRM', 'Sales', 'Admin'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const generated = `${randomPrefix}@${randomNum}`;
    setPassword(generated);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters long.');
      return;
    }

    if (usernameStatus === 'taken') {
      setErrorMessage(`Username "${cleanUsername}" is already taken. Please choose another unique username.`);
      return;
    }

    if (!password.trim() || password.trim().length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const computedOutlet =
        role === 'gurgaon_team' ? 'gurgaon' : role === 'faridabad_team' ? 'faridabad' : outletId;

      const finalEmail = email.trim() || `${cleanUsername}@zigzagzoh.com`;

      await api.createUser({
        name: name.trim(),
        username: cleanUsername,
        email: finalEmail,
        role,
        outletId: computedOutlet,
        password: password.trim(),
        phone: phone.trim() || undefined,
      });

      // Show success credentials card
      setCreatedCredentials({
        name: name.trim(),
        username: cleanUsername,
        password: password.trim(),
        role,
        email: finalEmail,
      });

      setShowModal(false);
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setPhone('');
      setUsernameStatus('idle');

      await fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `ZigZagZoh CRM Access Credentials:\nName: ${createdCredentials.name}\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}\nLogin URL: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  const handleCopyUserCreds = (u: User) => {
    const pw = u.assignedPassword || 'admin';
    const text = `Username: ${u.username}\nPassword: ${pw}\nPortal: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedUserId(u.id);
    setTimeout(() => setCopiedUserId(null), 2000);
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.updateUser(u.id, { active: !u.active });
      await fetchUsers();
    } catch (err: any) {
      alert(`Error updating user status: ${err.message}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword.trim()) return;

    try {
      await api.updateUser(resetModalUser.id, { password: newPassword.trim() });
      setResetSuccess(true);
      await fetchUsers();
      setTimeout(() => {
        setResetSuccess(false);
        setResetModalUser(null);
        setNewPassword('');
      }, 1500);
    } catch (err: any) {
      alert(`Error updating password: ${err.message}`);
    }
  };

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#302A28]">Users & Team Credentials</h1>
            <span className="px-2 py-0.5 rounded-md bg-[#FCE4D9] text-[#302A28] text-[10px] font-black tracking-wide border border-[#F4B6A0]/40">
              Admin Console
            </span>
          </div>
          <p className="text-xs text-[#7B706B] mt-0.5">
            Create and manage team members with strictly unique usernames and custom passwords.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create User with Unique Username</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#F0E4DF] rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FFF9F6] border-b border-[#F0E4DF] text-[#7B706B] font-bold text-[11px]">
            <tr>
              <th className="px-5 py-3">Team Member</th>
              <th className="px-4 py-3">Unique Username</th>
              <th className="px-4 py-3">Assigned Password</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Outlet Authorization</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F0E4DF]/60">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#7B706B]">
                  Loading authorized users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#7B706B]">
                  No users found. Click "Create User" to add team members.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isRevealed = revealedPasswords[u.id];
                const pw = u.assignedPassword || '••••••••';
                const isCopied = copiedUserId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-[#FFF9F6] transition-colors">
                    {/* Name & Contact */}
                    <td className="px-5 py-3.5 font-bold text-[#302A28]">
                      <div>{u.name}</div>
                      <span className="text-[10px] text-[#7B706B] font-normal flex items-center gap-1 mt-0.5">
                        <Mail className="w-2.5 h-2.5 text-[#7B706B]" />
                        {u.email}
                      </span>
                    </td>

                    {/* Unique Username */}
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF9F6] border border-[#F0E4DF] rounded-lg">
                        <span className="text-[11px] font-mono font-bold text-[#302A28]">
                          @{u.username}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(u.username);
                            setCopiedUserId(u.id);
                            setTimeout(() => setCopiedUserId(null), 1500);
                          }}
                          title="Copy username"
                          className="text-[#7B706B] hover:text-[#302A28] cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-[#2E8B65]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Assigned Password */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-[#302A28] bg-[#FFF9F6] px-2 py-1 rounded-md border border-[#F0E4DF]">
                          {isRevealed ? u.assignedPassword || 'admin' : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordReveal(u.id)}
                          className="p-1 rounded-md text-[#7B706B] hover:text-[#302A28] hover:bg-[#FCE4D9]/40 cursor-pointer"
                          title={isRevealed ? 'Hide password' : 'Show password'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyUserCreds(u)}
                          className="p-1 rounded-md text-[#7B706B] hover:text-[#302A28] hover:bg-[#FCE4D9]/40 cursor-pointer"
                          title="Copy Username & Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <RoleBadge role={u.role} />
                    </td>

                    {/* Outlet */}
                    <td className="px-4 py-3.5">
                      <OutletBadge outletId={u.outletId || 'all'} />
                    </td>

                    {/* Active Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active
                            ? 'bg-[#EBF7F0] text-[#2E8B65] border border-[#2E8B65]/20'
                            : 'bg-[#FEECEB] text-[#D9534F] border border-[#D9534F]/20'
                        }`}
                      >
                        {u.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setResetModalUser(u);
                            setNewPassword('');
                            setResetSuccess(false);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#F0E4DF] text-[#7B706B] hover:text-[#302A28] hover:bg-[#FFF9F6] transition-colors cursor-pointer"
                          title="Change user password"
                        >
                          Reset Pass
                        </button>

                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                              u.active
                                ? 'border-[#D9534F]/30 text-[#D9534F] hover:bg-[#FEECEB]'
                                : 'border-[#2E8B65]/30 text-[#2E8B65] hover:bg-[#EBF7F0]'
                            }`}
                          >
                            {u.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Create User Modal with Unique Username & Custom Password */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-[#F0E4DF] shadow-2xl space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0E4DF]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#FCE4D9] text-[#302A28]">
                  <UserPlus className="w-4 h-4 text-[#302A28]" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[#302A28]">Create New Team Account</h4>
                  <p className="text-[11px] text-[#7B706B]">Set unique username and customized login password</p>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-[#FEECEB] border border-[#D9534F]/30 rounded-xl text-[#D9534F] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#302A28] mb-1">
                    Full Name <span className="text-[#D9534F]">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-[#7B706B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikas Sharma"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!username && e.target.value) {
                          const suggested = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
                          setUsername(suggested);
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden focus:border-[#F4B6A0] focus:bg-white text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-[#302A28]">
                      Unique Username <span className="text-[#D9534F]">*</span>
                    </label>
                    {isCheckingUsername ? (
                      <span className="text-[10px] text-[#7B706B]">checking...</span>
                    ) : usernameStatus === 'available' ? (
                      <span className="text-[10px] text-[#2E8B65] font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> available
                      </span>
                    ) : usernameStatus === 'taken' ? (
                      <span className="text-[10px] text-[#D9534F] font-bold">already taken</span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B706B] font-mono font-bold">@</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. vikas_ggn"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                      className={`w-full pl-7 pr-3 py-2 bg-[#FFF9F6] border rounded-xl focus:outline-hidden focus:bg-white text-xs font-mono font-bold transition-colors ${
                        usernameStatus === 'taken'
                          ? 'border-[#D9534F] bg-[#FEECEB]/30'
                          : usernameStatus === 'available'
                          ? 'border-[#2E8B65] bg-[#EBF7F0]/30'
                          : 'border-[#F0E4DF] focus:border-[#F4B6A0]'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-[#7B706B] mt-0.5">Unique identifier used for logging into CRM</p>
                </div>
              </div>

              {/* Password & Generate Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#302A28]">
                    Custom Login Password <span className="text-[#D9534F]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] font-bold text-[#302A28] hover:text-[#EFA48A] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#F4B6A0]" />
                    <span>Auto-Generate Secure Password</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#7B706B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter custom password (min 4 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-20 py-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden focus:border-[#F4B6A0] focus:bg-white text-xs font-mono font-medium"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-[#7B706B] hover:text-[#302A28] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#302A28] mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#7B706B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder={username ? `${username}@zigzagzoh.com` : 'user@zigzagzoh.com'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden focus:border-[#F4B6A0] focus:bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#302A28] mb-1">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#7B706B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+91 98XXX XXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl focus:outline-hidden focus:border-[#F4B6A0] focus:bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* System Role & Outlet Allocation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#302A28] mb-1">
                    System Role <span className="text-[#D9534F]">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl font-medium focus:outline-hidden focus:border-[#F4B6A0]"
                  >
                    <option value="gurgaon_team">Gurgaon Team Member</option>
                    <option value="faridabad_team">Faridabad Team Member</option>
                    <option value="manager">Outlet Manager</option>
                    <option value="client_admin">Client Admin (ZigZagZoh)</option>
                    <option value="supreme_ads_owner">Supreme Ads Agency Owner</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#302A28] mb-1">Outlet Center Authorization</label>
                  <select
                    value={outletId}
                    disabled={role === 'gurgaon_team' || role === 'faridabad_team'}
                    onChange={(e) => setOutletId(e.target.value as any)}
                    className="w-full p-2 bg-white border border-[#F0E4DF] rounded-xl font-medium focus:outline-hidden focus:border-[#F4B6A0] disabled:opacity-50"
                  >
                    {role === 'gurgaon_team' ? (
                      <option value="gurgaon">Gurgaon Center (Locked to Role)</option>
                    ) : role === 'faridabad_team' ? (
                      <option value="faridabad">Faridabad Center (Locked to Role)</option>
                    ) : (
                      <>
                        <option value="all">All Outlets (Both Gurgaon & Faridabad)</option>
                        <option value="gurgaon">Gurgaon Center</option>
                        <option value="faridabad">Faridabad Center</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#F0E4DF]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#F0E4DF] text-[#7B706B] rounded-xl font-semibold hover:bg-[#FFF9F6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || usernameStatus === 'taken'}
                  className="px-5 py-2 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create User Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Created Credentials Card (Conveniently shareable) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-[#F0E4DF] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF7F0] border border-[#2E8B65]/30 flex items-center justify-center mx-auto text-[#2E8B65]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#302A28]">User Account Created!</h3>
              <p className="text-xs text-[#7B706B]">
                Copy these credentials to share with <strong className="text-[#302A28]">{createdCredentials.name}</strong>
              </p>
            </div>

            <div className="p-4 bg-[#FFF9F6] border border-[#F0E4DF] rounded-2xl space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#F0E4DF]/70">
                <span className="text-[#7B706B] font-sans font-semibold">Username:</span>
                <span className="font-bold text-[#302A28]">@{createdCredentials.username}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#F0E4DF]/70">
                <span className="text-[#7B706B] font-sans font-semibold">Password:</span>
                <span className="font-bold text-[#302A28] bg-white px-2 py-0.5 rounded border border-[#F0E4DF]">
                  {createdCredentials.password}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#F0E4DF]/70">
                <span className="text-[#7B706B] font-sans font-semibold">Role:</span>
                <span className="font-bold text-[#302A28] font-sans">{createdCredentials.role}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#7B706B] font-sans font-semibold">Email:</span>
                <span className="text-[#302A28]">{createdCredentials.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full py-2.5 px-4 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {copiedCredentials ? (
                  <>
                    <Check className="w-4 h-4 text-[#2E8B65]" />
                    <span>Credentials Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Login Credentials</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-2 text-xs font-semibold text-[#7B706B] hover:text-[#302A28] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password for Existing User */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-[#F0E4DF] shadow-2xl space-y-4 text-xs">
            <div>
              <h4 className="text-base font-extrabold text-[#302A28]">Reset Password</h4>
              <p className="text-xs text-[#7B706B]">
                Set a new password for <strong className="text-[#302A28]">@{resetModalUser.username}</strong>
              </p>
            </div>

            {resetSuccess ? (
              <div className="p-3 bg-[#EBF7F0] border border-[#2E8B65]/30 rounded-xl text-[#2E8B65] font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password updated successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block font-bold text-[#302A28] mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl font-mono text-xs focus:outline-hidden focus:border-[#F4B6A0]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7B706B] hover:text-[#302A28] cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-3 py-1.5 border border-[#F0E4DF] text-[#7B706B] rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-bold rounded-xl cursor-pointer"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
