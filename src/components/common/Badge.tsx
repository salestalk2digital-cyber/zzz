import React from 'react';
import type { LeadStatus, UserRole, OutletId, FollowUpOutcome } from '../../types/index.ts';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'peach' | 'soft-peach' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'peach', size = 'sm', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  const variantClasses = {
    peach: 'bg-[#FCE4D9] text-[#302A28] border border-[#F4B6A0]/40',
    'soft-peach': 'bg-[#FFF9F6] text-[#7B706B] border border-[#F0E4DF]',
    green: 'bg-[#EBF7F0] text-[#2E8B65] border border-[#2E8B65]/30',
    amber: 'bg-[#FEF6E8] text-[#D97706] border border-[#D97706]/30',
    red: 'bg-[#FEECEB] text-[#D9534F] border border-[#D9534F]/30',
    blue: 'bg-[#EFF6FF] text-[#5587C7] border border-[#5587C7]/30',
    purple: 'bg-[#F4EFFE] text-[#8C78B8] border border-[#8C78B8]/30',
    gray: 'bg-[#F5F5F4] text-[#7B706B] border border-[#E7E5E4]',
  }[variant];

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  let variant: BadgeProps['variant'] = 'gray';

  if (status === 'New Lead') variant = 'blue';
  else if (status === 'Contact Attempted' || status === 'Connected') variant = 'soft-peach';
  else if (status.startsWith('Follow-Up')) variant = 'peach';
  else if (status.includes('Meeting') || status.includes('Video')) variant = 'purple';
  else if (status.includes('Proposal') || status === 'Negotiation') variant = 'amber';
  else if (status === 'Converted / Booked') variant = 'green';
  else if (status === 'Lost / Closed' || status === 'Invalid / Spam') variant = 'red';
  else if (status === 'Interested — Future Date' || status === 'Booking Requested') variant = 'amber';

  return <Badge variant={variant}>{status}</Badge>;
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const roleDisplay = {
    supreme_ads_owner: { label: 'Supreme Ads Owner', variant: 'purple' as const },
    client_admin: { label: 'Client Admin', variant: 'peach' as const },
    manager: { label: 'Manager', variant: 'blue' as const },
    gurgaon_team: { label: 'Gurgaon Team', variant: 'soft-peach' as const },
    faridabad_team: { label: 'Faridabad Team', variant: 'amber' as const },
  }[role] || { label: role, variant: 'gray' as const };

  return <Badge variant={roleDisplay.variant}>{roleDisplay.label}</Badge>;
};

export const OutletBadge: React.FC<{ outletId: OutletId | 'all' }> = ({ outletId }) => {
  if (outletId === 'all') {
    return <Badge variant="purple">Both Outlets (GUR & FBD)</Badge>;
  }
  return outletId === 'gurgaon' ? (
    <Badge variant="blue" className="font-semibold">Gurgaon</Badge>
  ) : (
    <Badge variant="amber" className="font-semibold">Faridabad</Badge>
  );
};

export const QualityScoreBadge: React.FC<{ score: number; band: 'High' | 'Medium' | 'Low' }> = ({ score, band }) => {
  const variant = band === 'High' ? 'green' : band === 'Medium' ? 'amber' : 'red';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${
      band === 'High' ? 'bg-[#EBF7F0] text-[#2E8B65]' : band === 'Medium' ? 'bg-[#FEF6E8] text-[#D97706]' : 'bg-[#FEECEB] text-[#D9534F]'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {score}/100 • {band}
    </span>
  );
};
