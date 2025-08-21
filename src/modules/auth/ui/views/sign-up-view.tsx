"use client";
import {Input} from "@/components/ui/input";
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button";
import { OctagonAlertIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {z} from "zod";
import Link from "next/link";
import {zodResolver} from "@hookform/resolvers/zod";
import { Alert,AlertTitle } from "@/components/ui/alert";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { FaGithub,FaGoogle } from "react-icons/fa";

const formSchema = z.object({
    name:z.string().min(1,{message:"Name is required"}),
    email: z.string().email(),
    password: z.string().min(1, { message: "Password is required" }),
    confirmPassword: z.string().min (1,{message:"Retype your password for confirmation"}),
})
.refine((data)=>data.password === data.confirmPassword, {
    message:"Passwords don't match",
    path:["confirmPassword"]
});

export const SignUpView = () => {
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name:"",
            email: "",
            password: "",
            confirmPassword:"",
        },
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        setError(null);
        setPending(true);
        const { error } = await authClient.signUp.email(
            {
                name: data.name,
                email: data.email,
                password: data.password,
                callbackURL:"/",
            },
            {
                onSuccess: () => {
                    setPending(false)
                },
                onError: ({ error }: { error: { message: string } }) => {
                    setError(error.message);
                },
            }
        );
        setPending(false);
    }

      const onSocial = async (provider:"github"|"google") => {
        setError(null);
        setPending(true);
        authClient.signIn.social(
            {
                provider: provider,
                callbackURL:"/",
            },
            {
                onSuccess: () => {
                    setPending(false);
                    
                },
                onError: ({ error }) => {
                    setPending(false);
                    setError(error.message);
                },
            }
        );
        setPending(false);
    }

    return (
        <div className="flex flex-col gap-6">
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                  <Form{...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
                      <div className="flex flex-col gap-6">
                        <div className="tex-2xl font-bold">
                            <h1 className="text-2xl font-bold">
                                Let's get started
                            </h1>
                            <p className="text-muted-foreground text-balance">
                                Create your account
                            </p>
                        </div>
                        <div className="grid gap-3">
   <FormField
    control={form.control}
    name="name"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Name</FormLabel>
        <FormControl>
          <Input
            type="text"
            placeholder="John Doe"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  {/* Email field */}
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input
            type="email"
            placeholder="m@example.com"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />

  {/* Password field */}
  <FormField
    control={form.control}
    name="password"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Password</FormLabel>
        <FormControl>
          <Input
            type="password"
            placeholder="********"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
  <FormField
    control={form.control}
    name="confirmPassword"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Confirm Password</FormLabel>
        <FormControl>
          <Input
            type="password"
            placeholder="********"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />

                        {!!error && (
                            <Alert className="bg-destructive/10 border-none">
                                <OctagonAlertIcon className="h-4 w-4 !text-destructive" />
                                <AlertTitle>{error}</AlertTitle>
                            </Alert>
                        )}
                        <Button
                          type="submit"
                          className="w-full"
                        >
                        Sign Up
                        </Button>
                        <div className="after:border-border relative text-center text-sm after:absolute
                        after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after border-t">
                          <span className="bg-card text-muted-foreground relative z-10 px-2">
                          Or continue with
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            disabled={pending}
                            onClick={()=>onSocial("google")}
                            variant="outline"
                            type="button"
                            className="w-full"
                           >
                            <FaGoogle />
                           </Button>
                           <Button
                            disabled={pending}
                            onClick={()=>onSocial("google")}
                            variant="outline"
                            type="button"
                            className="w-full"
                           >
                            <FaGithub />
                           </Button>
                        </div>
                        <div className="text-center text-sm">
                            Already have an account?{" "}
                            <Link href="/sign-up" className="underline underline-offset-4">
                            Sign in
                            </Link>
                        </div>
                      </div>
                  </form>
                </Form>
                    <div className="bg-green-400 relative hidden md:flex flex-col gap-y-4 items-center justify-center">
                        <img src="/logo.svg" alt="Image" className="h-[92px] w-[92px]" />
                        <p className="p-1 text-2xl font-semibold text-white">
                            Meet.AI
                        </p>
                    </div>
                </CardContent>
            </Card>
            <div
  className="text-muted-foreground text-center text-xs text-balance
             *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-primary">
  By clicking continue, you agree to our 
  <a href="#"> Terms of Service </a> and 
  <a href="#"> Privacy Policy </a>
</div>
        </div>
    );
}
