'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Building,
  Mail,
  Phone,
  User,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Claim {
  id: string;
  slug: string;
  propertyName: string | null;
  contactName: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  createdAt: Date;
}

interface ClaimsQueueProps {
  claims: Claim[];
}

export function ClaimsQueue({ claims: initialClaims }: ClaimsQueueProps) {
  const [claims, setClaims] = useState(initialClaims);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingClaim, setRejectingClaim] = useState<Claim | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'verified':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="h-4 w-4" />;
      case 'verified':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleVerify = async (claim: Claim) => {
    if (!confirm(`Verify claim for ${claim.propertyName || claim.slug} and send login to ${claim.email}?`)) {
      return;
    }

    setLoading(claim.id);
    setError(null);

    try {
      const response = await fetch('/api/super-admin/claims/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: claim.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify claim');
      }

      setClaims(claims.map(c => 
        c.id === claim.id ? { ...c, status: 'verified' } : c
      ));

      alert(`✅ Claim verified! Login sent to ${claim.email}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const openRejectDialog = (claim: Claim) => {
    setRejectingClaim(claim);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingClaim) return;

    setLoading(rejectingClaim.id);
    setError(null);

    try {
      const response = await fetch('/api/super-admin/claims/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          claimId: rejectingClaim.id,
          reason: rejectReason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject claim');
      }

      setClaims(claims.map(c => 
        c.id === rejectingClaim.id ? { ...c, status: 'rejected' } : c
      ));

      setRejectDialogOpen(false);
      setRejectingClaim(null);
      setRejectReason('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const pendingClaims = claims.filter(c => c.status === 'new');
  const processedClaims = claims.filter(c => c.status !== 'new');

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Claims Queue</h1>
          <p className="text-gray-300">
            Review and verify property ownership claims
          </p>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-800">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{pendingClaims.length}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold">
                  {claims.filter(c => c.status === 'verified').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">
                  {claims.filter(c => c.status === 'rejected').length}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingClaims.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              Pending Claims ({pendingClaims.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingClaims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  loading={loading}
                  onVerify={handleVerify}
                  onReject={openRejectDialog}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {processedClaims.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-600" />
              Processed Claims ({processedClaims.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processedClaims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  loading={loading}
                  onVerify={handleVerify}
                  onReject={openRejectDialog}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  isProcessed
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {claims.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No claims submitted yet</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this claim for{' '}
              {rejectingClaim?.propertyName || rejectingClaim?.slug}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Internal note about why this claim was rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingClaim(null);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading === rejectingClaim?.id}
            >
              {loading === rejectingClaim?.id && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Reject Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ClaimCardProps {
  claim: Claim;
  loading: string | null;
  onVerify: (claim: Claim) => void;
  onReject: (claim: Claim) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  isProcessed?: boolean;
}

function ClaimCard({
  claim,
  loading,
  onVerify,
  onReject,
  getStatusColor,
  getStatusIcon,
  isProcessed = false,
}: ClaimCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Building className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">
              {claim.propertyName || claim.slug}
            </h3>
            <Badge className={getStatusColor(claim.status)}>
              <span className="flex items-center gap-1">
                {getStatusIcon(claim.status)}
                {claim.status}
              </span>
            </Badge>
          </div>
          <p className="text-sm text-gray-600">Subdomain: {claim.slug}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center text-sm">
          <User className="h-4 w-4 mr-2 text-gray-400" />
          <span className="text-gray-600">
            {claim.contactName || 'Not provided'}
          </span>
        </div>
        <div className="flex items-center text-sm">
          <Mail className="h-4 w-4 mr-2 text-gray-400" />
          <span className="text-gray-600 truncate">{claim.email}</span>
        </div>
        <div className="flex items-center text-sm">
          <Phone className="h-4 w-4 mr-2 text-gray-400" />
          <span className="text-gray-600">
            {claim.phone || 'Not provided'}
          </span>
        </div>
        <div className="flex items-center text-sm">
          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
          <span className="text-gray-600">{formatDate(claim.createdAt)}</span>
        </div>
      </div>

      {claim.message && (
        <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
          <p className="font-medium mb-1">Message:</p>
          <p>{claim.message}</p>
        </div>
      )}

      {!isProcessed && (
        <div className="flex gap-2">
          <Button
            onClick={() => onVerify(claim)}
            disabled={loading === claim.id}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading === claim.id ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Verify & Send Login
          </Button>
          <Button
            variant="outline"
            onClick={() => onReject(claim)}
            disabled={loading === claim.id}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
