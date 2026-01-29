import * as React from "react"
import { X, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  allowCustom?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione...",
  className,
  allowCustom = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value))
  }

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      handleUnselect(value)
    } else {
      onChange([...selected, value])
    }
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && inputValue === "" && selected.length > 0) {
      onChange(selected.slice(0, -1))
    } else if (e.key === "Enter" && inputValue.trim() && allowCustom) {
      e.preventDefault()
      const newValue = inputValue.trim()
      if (!selected.includes(newValue)) {
        onChange([...selected, newValue])
        setInputValue("")
      }
    }
  }

  // Filter options based on input
  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase())
  )

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          className
        )}
        onClick={() => setOpen(true)}
      >
        {selected.map((value) => {
          const option = options.find((opt) => opt.value === value)
          return (
            <Badge
              key={value}
              variant="secondary"
              className="bg-[#2db4af]/10 text-[#2db4af] hover:bg-[#2db4af]/20"
            >
              {option?.label || value}
              <button
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnselect(value)
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleUnselect(value)
                }}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          )
        })}
        <input
          placeholder={selected.length === 0 ? placeholder : ""}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px]"
        />
      </div>

      {open && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-md border bg-popover shadow-md outline-none">
          <div className="max-h-64 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-sm text-center text-muted-foreground">
                {inputValue ? (
                  allowCustom ? (
                    <div>
                      Nenhuma opção encontrada.
                      <button
                        onClick={() => {
                          const newValue = inputValue.trim()
                          if (newValue && !selected.includes(newValue)) {
                            onChange([...selected, newValue])
                            setInputValue("")
                          }
                        }}
                        className="mt-2 w-full rounded-md bg-[#2db4af] px-3 py-2 text-white hover:bg-[#28a39e]"
                      >
                        Adicionar "{inputValue}"
                      </button>
                    </div>
                  ) : (
                    "Nenhuma opção encontrada"
                  )
                ) : (
                  "Nenhuma opção disponível"
                )}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{option.label}</span>
                  </div>
                )
              })
            )}
          </div>
          <div className="border-t p-2">
            <button
              onClick={() => setOpen(false)}
              className="w-full rounded-md bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/80"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
