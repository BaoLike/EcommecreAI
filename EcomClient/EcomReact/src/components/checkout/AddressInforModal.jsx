import React from 'react'
import { useState } from 'react'
import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

export const AddressInforModal = ({isOpen, setIsOpen, children}) => {
    return (
    <div><Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        {/* The backdrop, rendered as a fixed sibling to the panel container */}
        <DialogBackdrop className="fixed inset-0 bg-black/30" />

        {/* Full-screen container to center the panel */}
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          {/* The actual dialog panel  */}
          <DialogPanel className="max-w-4xl w-full space-y-4 bg-white p-12">
            <div className='px-6 py-6'>
                {children}
            </div>
            {/* <Description>This will permanently deactivate your account</Description> */}
            <div className="flex gap-4">
              <button onClick={() => setIsOpen(false)}>Cancel</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
    )
}
