"use client";
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from "@/components/ui/dialog";
import { Drawer,DrawerContent,DrawerHeader,DrawerTitle,DrawerDescription } from "@/components/ui/drawer";
import { useIsMobile} from "@/hooks/use-mobile";

interface ResponsiveDialogProps {
  title: string;
  description: string;
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  children: React.ReactNode;
};

export const ResponsiveDialog = ({
  title,
  description,
  open,
  onOpenChangeAction,
  children
}: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChangeAction}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
          {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}


