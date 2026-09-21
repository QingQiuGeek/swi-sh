"use client";

import { useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/provider";

/** 全局登录 / 注册弹窗，通过 openAuthDialog() 唤起，不改变 URL */
export function AuthDialog() {
  const t = useT();
  const { dialog, closeAuthDialog, handleAuthenticated } = useAuth();
  const [tab, setTab] = useState("login");

  return (
    <Dialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) {
          closeAuthDialog();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.auth.dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialog.description ?? t.auth.dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="login">{t.auth.loginTab}</TabsTrigger>
            <TabsTrigger value="register">{t.auth.registerTab}</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="pt-2">
            <LoginForm onSuccess={handleAuthenticated} />
          </TabsContent>

          <TabsContent value="register" className="pt-2">
            <RegisterForm onSuccess={handleAuthenticated} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}