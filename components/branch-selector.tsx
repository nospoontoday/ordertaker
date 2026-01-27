"use client"

import { useState } from "react"
import { useBranch } from "@/contexts/branch-context"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Building2, ChevronDown, Check, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BranchSelectorProps {
  variant?: "default" | "compact"
  className?: string
}

export function BranchSelector({ variant = "default", className }: BranchSelectorProps) {
  const { branches, currentBranch, setCurrentBranch, isLoading, preferredBranch } = useBranch()
  const { user, setPreferredBranch } = useAuth()
  const { toast } = useToast()
  const [isSettingDefault, setIsSettingDefault] = useState(false)

  const handleSetAsDefault = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You need to be logged in to set a preferred branch.",
        variant: "destructive",
      })
      return
    }

    setIsSettingDefault(true)
    const result = await setPreferredBranch(currentBranch.id)
    setIsSettingDefault(false)

    if (result.success) {
      toast({
        title: "Default branch set",
        description: `${currentBranch.name} is now your default branch.`,
      })
    } else {
      toast({
        title: "Failed to set default",
        description: result.error || "Something went wrong.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={className}>
        <Building2 className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    )
  }

  const isCurrentBranchPreferred = preferredBranch === currentBranch.id

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <Building2 className="h-4 w-4 mr-2" />
          {variant === "compact" ? currentBranch.name.split(" ")[0] : currentBranch.name}
          {isCurrentBranchPreferred && (
            <Star className="h-3 w-3 ml-1 fill-yellow-400 text-yellow-400" />
          )}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => setCurrentBranch(branch)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span>{branch.name}</span>
              {preferredBranch === branch.id && (
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            {currentBranch.id === branch.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        {user && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSetAsDefault}
              disabled={isCurrentBranchPreferred || isSettingDefault}
              className="flex items-center gap-2"
            >
              <Star className={`h-4 w-4 ${isCurrentBranchPreferred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              {isSettingDefault ? (
                "Setting..."
              ) : isCurrentBranchPreferred ? (
                "Already your default"
              ) : (
                "Set as Default"
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
