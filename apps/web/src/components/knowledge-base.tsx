import { useEffect, useState } from "react"
import { trpc } from "@/lib/trpc"
import { Command } from "cmdk"
import { Search, Plus, Trash } from "lucide-react"
import { toast } from "sonner"

interface KnowledgeEntry {
  id: number
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

interface KnowledgeBaseProps {
  isOpen: boolean
  onClose: () => void
}

export function KnowledgeBase({ isOpen, onClose }: KnowledgeBaseProps) {
  const [search, setSearch] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")

  const utils = trpc.useUtils()
  const { data: entries = [], isLoading } = trpc.knowledge.getAll.useQuery()
  const createEntry = trpc.knowledge.create.useMutation({
    onSuccess: () => {
      utils.knowledge.getAll.invalidate()
      setIsCreating(false)
      setNewTitle("")
      setNewContent("")
      toast.success("Knowledge entry created")
    },
  })
  const deleteEntry = trpc.knowledge.delete.useMutation({
    onSuccess: () => {
      utils.knowledge.getAll.invalidate()
      toast.success("Knowledge entry deleted")
    },
  })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [onClose])

  const filteredEntries = entries.filter((entry) => {
    if (search === "") return true
    const searchLower = search.toLowerCase()
    return (
      entry.title.toLowerCase().includes(searchLower) ||
      entry.content.toLowerCase().includes(searchLower)
    )
  })

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={onClose}
      label="Knowledge Base"
      className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[90vw] max-w-[750px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-background p-0 shadow-lg"
    >
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search knowledge base..."
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        {isLoading ? (
          <Command.Loading>Loading...</Command.Loading>
        ) : (
          <>
            {isCreating ? (
              <div className="space-y-2 p-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Content"
                  className="h-32 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newTitle || !newContent) {
                        toast.error("Please fill in all fields")
                        return
                      }
                      createEntry.mutate({
                        title: newTitle,
                        content: newContent,
                      })
                    }}
                    className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Command.Item
                  onSelect={() => setIsCreating(true)}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <div className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Create new entry
                  </div>
                </Command.Item>

                {filteredEntries.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No entries found.
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <Command.Item
                      key={entry.id}
                      value={entry.title}
                      className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <div>
                        <div className="font-medium">{entry.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.content.slice(0, 100)}
                          {entry.content.length > 100 ? "..." : ""}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (
                            window.confirm(
                              "Are you sure you want to delete this entry?"
                            )
                          ) {
                            deleteEntry.mutate({ id: entry.id })
                          }
                        }}
                        className="ml-2 rounded-md p-1 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </Command.Item>
                  ))
                )}
              </>
            )}
          </>
        )}
      </Command.List>
    </Command.Dialog>
  )
} 