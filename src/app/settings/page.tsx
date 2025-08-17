"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { Settings, Moon, User, Bell, Shield, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <SidebarNav />
      
      <div className="min-h-screen bg-background lg:ml-80">
        <main className="container mx-auto px-4 py-6 lg:py-6 pt-20 lg:pt-6 space-y-6 max-w-4xl">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Manage your account preferences and app settings
            </p>
          </div>

          <div className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how Proxima Tracker looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Theme</h3>
                <p className="text-sm text-muted-foreground">Switch between light, dark, and system themes</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Manage your account preferences and profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Profile Settings</h3>
                <p className="text-sm text-muted-foreground">Update your personal information</p>
              </div>
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Password</h3>
                <p className="text-sm text-muted-foreground">Change your account password</p>
              </div>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Budget Alerts</h3>
                <p className="text-sm text-muted-foreground">Get notified when approaching budget limits</p>
              </div>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Weekly Reports</h3>
                <p className="text-sm text-muted-foreground">Receive weekly spending summaries</p>
              </div>
              <Badge variant="outline">Disabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Control your privacy settings and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">
                Enable 2FA
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Data Export</h3>
                <p className="text-sm text-muted-foreground">Download your financial data</p>
              </div>
              <Button variant="outline" size="sm">
                Export Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Manage your financial data and backups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Auto Backup</h3>
                <p className="text-sm text-muted-foreground">Automatically backup your data</p>
              </div>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Clear Cache</h3>
                <p className="text-sm text-muted-foreground">Clear app cache and temporary data</p>
              </div>
              <Button variant="outline" size="sm">
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>
          </div>
        </main>
      </div>
    </>
  );
}