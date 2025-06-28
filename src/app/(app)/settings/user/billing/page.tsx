import {
  CreditCard,
  Receipt,
  Package,
  Calendar,
  Download,
  AlertCircle,
} from 'lucide-react';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function BillingSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Fetch subscription data if available
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1);

  const subscription = subscriptions?.[0];

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing Settings</h1>
        <p className="text-muted-foreground">
          Manage your subscription, payment methods, and billing history.
        </p>
      </header>

      <div className="space-y-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle>Current Plan</CardTitle>
              </div>
              {subscription && <Badge variant="default">Active</Badge>}
            </div>
            <CardDescription>
              Your subscription details and usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">Pro Plan</h4>
                    <p className="text-sm text-muted-foreground">
                      Active Subscription
                    </p>
                  </div>
                  <Button variant="outline">Change Plan</Button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Next billing date
                    </p>
                    <p className="font-medium">
                      {subscription.current_period_end
                        ? new Date(
                            subscription.current_period_end,
                          ).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Member since
                    </p>
                    <p className="font-medium">
                      {subscription.created
                        ? new Date(subscription.created).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="font-medium mb-2">No Active Subscription</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to unlock premium features
                </p>
                <Button>View Plans</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Payment Methods</CardTitle>
            </div>
            <CardDescription>
              Manage your payment methods for subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">
                      Expires 12/24
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Default</Badge>
              </div>

              <Button variant="outline" className="w-full">
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <CardTitle>Billing History</CardTitle>
            </div>
            <CardDescription>
              View and download your past invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {new Date(
                          Date.now() - i * 30 * 24 * 60 * 60 * 1000,
                        ).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">$29.00</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" className="w-full">
                View All Invoices
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Billing Alerts</CardTitle>
            </div>
            <CardDescription>
              Configure notifications for billing events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="payment-reminders" className="flex-1">
                  <p className="font-medium">Payment Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified before subscription renewal
                  </p>
                </label>
                <input
                  id="payment-reminders"
                  type="checkbox"
                  className="toggle"
                  defaultChecked
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="receipt-emails" className="flex-1">
                  <p className="font-medium">Receipt Emails</p>
                  <p className="text-sm text-muted-foreground">
                    Receive receipts for all transactions
                  </p>
                </label>
                <input
                  id="receipt-emails"
                  type="checkbox"
                  className="toggle"
                  defaultChecked
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="usage-alerts" className="flex-1">
                  <p className="font-medium">Usage Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when approaching usage limits
                  </p>
                </label>
                <input id="usage-alerts" type="checkbox" className="toggle" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
