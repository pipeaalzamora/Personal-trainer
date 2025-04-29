"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface GenderSelectionModalProps {
  onGenderSelect: (gender: 'male' | 'female') => void;
}

export default function GenderSelectionModal({ onGenderSelect }: GenderSelectionModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);

  // Mostrar el modal cuando el componente se monta
  useEffect(() => {
    // Mostrar el modal siempre que se cargue la página
    setOpen(true);
    
    // Recuperar la última selección para preseleccionarla en el modal
    const storedGender = localStorage.getItem('selectedGender');
    if (storedGender) {
      setSelectedGender(storedGender as 'male' | 'female');
    }
  }, []);

  const handleGenderSelect = () => {
    if (selectedGender) {
      // Guardar la selección en localStorage para futuras visitas
      localStorage.setItem('selectedGender', selectedGender);
      onGenderSelect(selectedGender);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccione su género</DialogTitle>
          <DialogDescription>
            Por favor, seleccione su género para personalizar su experiencia de entrenamiento.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedGender || ""} onValueChange={(value) => setSelectedGender(value as 'male' | 'female')}>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="font-medium">Hombre</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="font-medium">Mujer</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="flex justify-center">
          <Button 
            onClick={handleGenderSelect} 
            disabled={!selectedGender}
            className="w-full"
          >
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 