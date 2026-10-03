'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Code2, Share2 } from 'lucide-react';

interface EmbedKitProps {
  subdomain: string;
  primaryColor?: string;
  amaldivesSlug?: string | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function EmbedKit({ subdomain, primaryColor = '#0d9488', amaldivesSlug }: EmbedKitProps) {
  const stayUrl = `https://${subdomain}.vayves.com`;
  const bookUrl = `${stayUrl}/book`;
  const amaldivesUrl = amaldivesSlug
    ? `https://www.amaldives.com/guesthouses/${amaldivesSlug}`
    : null;

  const embedScript = `<script src="https://vayves.com/embed.js" data-subdomain="${subdomain}" data-color="${primaryColor}" data-label="Book direct" async></script>`;

  const whatsappText = encodeURIComponent(
    `Book directly with us (no OTA fees): ${bookUrl}`
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-cyan-600" />
            Your booking channels
          </CardTitle>
          <CardDescription>
            Direct bookings at 4% platform fee. amaldives.com marketplace bookings at 10% (still better than 15-18% OTA rates).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Direct booking page (4% platform fee)</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={bookUrl} className="font-mono text-sm" />
              <CopyButton text={bookUrl} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Share this link on Facebook, Instagram, WhatsApp, or anywhere. Bookings from your own links are charged 4%.
            </p>
          </div>
          {amaldivesUrl && (
            <div>
              <Label>Your amaldives.com listing (10% marketplace fee)</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={amaldivesUrl} className="font-mono text-sm" />
                <CopyButton text={amaldivesUrl} />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Travelers find you on amaldives.com and book direct. These marketplace bookings are charged 10% (vs 15-18% on OTAs).
              </p>
            </div>
          )}
          {!amaldivesUrl && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-1">Want more bookings?</p>
              <p>List on amaldives.com to get found by travelers. Contact support to connect your listing.</p>
            </div>
          )}
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm text-cyan-700 hover:underline"
          >
            Share on WhatsApp →
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-cyan-600" />
            One-line website embed (4% platform fee)
          </CardTitle>
          <CardDescription>
            Paste this single line into your website (or ask anyone who built your site). A &quot;Book direct&quot; button will appear automatically. Bookings from your website are charged 4%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-50 border rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all">
            {embedScript}
          </pre>
          <div className="mt-3">
            <CopyButton text={embedScript} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
