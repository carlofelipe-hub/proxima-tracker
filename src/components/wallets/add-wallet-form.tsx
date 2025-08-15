"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { WalletType } from "@prisma/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const walletSchema = z.object({
  name: z.string().min(1, "Wallet name is required"),
  type: z.nativeEnum(WalletType),
  balance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Balance must be a valid positive number"
  }),
})

type WalletFormData = z.infer<typeof walletSchema>

interface AddWalletFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const walletTypeOptions = [
  { value: WalletType.GCASH, label: "GCash" },
  { value: WalletType.BPI_BANK, label: "BPI Bank" },
  { value: WalletType.UNION_BANK, label: "UnionBank" },
  { value: WalletType.CASH, label: "Cash" },
  { value: WalletType.SAVINGS, label: "Savings Account" },
  { value: WalletType.CREDIT_CARD, label: "Credit Card" },
  { value: WalletType.OTHER, label: "Other" },
]

export function AddWalletForm({ open, onOpenChange, onSuccess }: AddWalletFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<WalletFormData>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      name: "",
      type: WalletType.CASH,
      balance: "0",
    },
  })

  const onSubmit = async (data: WalletFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          balance: parseFloat(data.balance),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create wallet")
      }

      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Error creating wallet:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Wallet</DialogTitle>
          <DialogDescription>
            Create a new wallet to track your finances across different accounts.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My BPI Account" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {walletTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Balance (PHP)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Wallet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}