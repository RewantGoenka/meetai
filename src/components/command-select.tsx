import {ReactNode,useState} from "react";
import { CommandDialog, CommandInput, CommandEmpty, CommandList,CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button} from "./ui/button";

interface Props {
    options: Array<{
        id: string;
        value: string;
        children: ReactNode;
    }>;
    OnSelect: (value: string) => void;
    onSearch?: (value: string) => void;
    value?: string;
    placeholder?: string;
    isSearchable?: boolean;
    className?: string;
};

export const CommandSelect = ({ options, OnSelect, onSearch, value, placeholder = "Select a value", isSearchable = true, className }: Props) => {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((option) => option.value === value);
    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                type="button"
                variant="outline"
                role="combobox"
                className={cn("h-9 justify-between font-normal px-2",
                     !selectedOption && "text-muted-foreground",
                     className,
                )}
            >
                <div>
                {selectedOption ?.children ?? placeholder}
                </div>
                <ChevronsUpDownIcon />
            </Button>
            <CommandDialog 
             open={open} 
             onOpenChange={setOpen}
            >
              <CommandInput placeholder="Search..."  onValueChange={onSearch} />
              <CommandList>
                <CommandEmpty>
                    <span className="text-muted-foreground text-sm">
                        No options found
                    </span>
                </CommandEmpty>
                {options.map((option) => (
                    <CommandItem
                        key={option.id}
                        onSelect={() => {
                            OnSelect(option.value);
                            setOpen(false);
                        }}
                    >
                        {option.children}
                    </CommandItem>
                ))}
              </CommandList>
            </CommandDialog>
        </>
    );
};