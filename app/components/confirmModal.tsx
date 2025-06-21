import {Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure} from "@heroui/react";
import type { ReactNode } from "react";

interface DeleteModalProps{
  header:ReactNode,
    content:ReactNode,
    isOpen: boolean,
    onOpenChange: () => void,
    children:ReactNode
}
export default function ConfirmModal({isOpen,onOpenChange,children,content,header}: DeleteModalProps) {

  return (
    <>
      <Modal backdrop="blur"  className=" !border !border-black/20 bg-dashboard-secondary " isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent className="dark:bg-default-100">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-center gap-1 text-white font-montserrat font-semibold text-2xl text-danger">{header}</ModalHeader>
              <ModalBody className="flex items-center justify-center">
                <p className="font-nunito text-md text-white">{content}</p>
              </ModalBody>
              <ModalFooter className="flex items-center justify-center ">
                {children}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
