import { IconBuilding, IconBuildingStore, IconCheck, IconLoader2 } from "@tabler/icons-react"
import { useBranch } from "@/context/branch-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function BranchSelector() {
  const { branches, selectedBranch, setSelectedBranch, isCompanyView, isLoading } = useBranch()

  if (isLoading) {
    return (
      <Button variant="outline" className="gap-2" disabled>
        <IconLoader2 className="size-4 animate-spin" />
        <span>Loading...</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {isCompanyView ? (
            <>
              <IconBuilding className="size-4" />
              <span>All Branches</span>
            </>
          ) : (
            <>
              <IconBuildingStore className="size-4" />
              <span>{selectedBranch?.name}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select Branch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setSelectedBranch(null)}
          className="gap-2"
        >
          <IconBuilding className="size-4" />
          <span className="flex-1">All Branches (Company)</span>
          {isCompanyView && <IconCheck className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {branches.length > 0 ? (
          branches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => setSelectedBranch(branch)}
              className="gap-2"
            >
              <IconBuildingStore className="size-4" />
              <span className="flex-1">{branch.name}</span>
              {selectedBranch?.id === branch.id && <IconCheck className="size-4" />}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No branches available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
