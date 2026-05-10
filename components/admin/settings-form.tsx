'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  description?: string | null;
  plan: string;
  commissionRate: number;
  status: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone?: string | null;
  email?: string | null;
}

interface SettingsFormProps {
  tenant: Tenant;
  property: Property | null;
}

export function SettingsForm({ tenant, property }: SettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [name, setName] = useState(tenant.name);
  const [description, setDescription] = useState(tenant.description ?? '');
  const [address, setAddress] = useState(property?.address ?? '');
  const [city, setCity] = useState(property?.city ?? '');
  const [state, setState] = useState(property?.state ?? '');
  const [phone, setPhone] = useState(property?.phone ?? '');
  const [email, setEmail] = useState(property?.email ?? '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedAt(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          address,
          city,
          state,
          phone,
          email,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Tell guests about your property…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm pt-2">
              <div>
                <Label className="text-gray-500">Subdomain</Label>
                <p className="font-medium text-cyan-700">{tenant.subdomain}.stay.amaldives.com</p>
              </div>
              <div>
                <Label className="text-gray-500">Plan</Label>
                <p className="font-medium capitalize">{tenant.plan}</p>
              </div>
              <div>
                <Label className="text-gray-500">Commission Rate</Label>
                <p className="font-medium">{(tenant.commissionRate * 100).toFixed(0)}%</p>
              </div>
              <div>
                <Label className="text-gray-500">Status</Label>
                <p
                  className={`font-medium ${
                    tenant.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tenant.status}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {property && (
          <Card>
            <CardHeader>
              <CardTitle>Contact &amp; Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Island / City</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Atoll / State</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3">
          {savedAt && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Saved
            </span>
          )}
          <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
