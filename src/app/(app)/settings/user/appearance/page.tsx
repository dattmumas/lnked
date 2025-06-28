import { Sun, Moon, Monitor, Palette, Type, Layout } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

export default function AppearanceSettingsPage() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Appearance Settings</h1>
        <p className="text-muted-foreground">
          Customize how the application looks and feels.
        </p>
      </header>

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Theme</CardTitle>
            </div>
            <CardDescription>Select your preferred color theme</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup defaultValue="system" className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent">
                <RadioGroupItem value="light" id="light" />
                <Label
                  htmlFor="light"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Sun className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Light</p>
                    <p className="text-sm text-muted-foreground">
                      Bright theme for daytime use
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent">
                <RadioGroupItem value="dark" id="dark" />
                <Label
                  htmlFor="dark"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Moon className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Dark</p>
                    <p className="text-sm text-muted-foreground">
                      Easy on the eyes in low light
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent">
                <RadioGroupItem value="system" id="system" />
                <Label
                  htmlFor="system"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Monitor className="h-4 w-4" />
                  <div>
                    <p className="font-medium">System</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically match your device theme
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Typography Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              <CardTitle>Typography</CardTitle>
            </div>
            <CardDescription>
              Adjust text size and font preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="font-size" className="mb-3 block">
                Font Size
              </Label>
              <RadioGroup defaultValue="medium" className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="small" id="small" />
                  <Label htmlFor="small" className="cursor-pointer">
                    Small
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="cursor-pointer">
                    Medium
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="large" id="large" />
                  <Label htmlFor="large" className="cursor-pointer">
                    Large
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dyslexic-font">Dyslexic Font</Label>
                <p className="text-sm text-muted-foreground">
                  Use a font optimized for readability
                </p>
              </div>
              <Switch id="dyslexic-font" />
            </div>
          </CardContent>
        </Card>

        {/* Layout Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              <CardTitle>Layout</CardTitle>
            </div>
            <CardDescription>
              Configure layout and display options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="compact-mode">Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Show more content with reduced spacing
                </p>
              </div>
              <Switch id="compact-mode" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sidebar-collapsed">Collapsed Sidebar</Label>
                <p className="text-sm text-muted-foreground">
                  Start with the sidebar minimized
                </p>
              </div>
              <Switch id="sidebar-collapsed" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="animations">Animations</Label>
                <p className="text-sm text-muted-foreground">
                  Enable smooth transitions and effects
                </p>
              </div>
              <Switch id="animations" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Color Customization */}
        <Card>
          <CardHeader>
            <CardTitle>Accent Color</CardTitle>
            <CardDescription>
              Choose your preferred accent color
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-3">
              {[
                { name: 'Blue', color: 'bg-blue-500' },
                { name: 'Purple', color: 'bg-purple-500' },
                { name: 'Green', color: 'bg-green-500' },
                { name: 'Orange', color: 'bg-orange-500' },
                { name: 'Pink', color: 'bg-pink-500' },
                { name: 'Slate', color: 'bg-slate-500' },
              ].map((color) => (
                <button
                  key={color.name}
                  className={`h-12 w-full rounded-lg ${color.color} hover:ring-2 hover:ring-offset-2 hover:ring-offset-background hover:ring-current transition-all`}
                  title={color.name}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg">Save Preferences</Button>
        </div>
      </div>
    </>
  );
}
