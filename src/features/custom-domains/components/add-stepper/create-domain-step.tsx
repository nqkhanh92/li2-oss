import { CreateDomainForm } from "../form/create-form";
import { useStepper } from "./add-stepper";
import { useDomainStore } from "@/shared/stores/domain-stepper-store";

export const CreateDomainStep = () => {
  const { setDomainId } = useDomainStore();
  const { next } = useStepper();
  return (
    <CreateDomainForm
      onFinish={(data) => {
        setDomainId(data.id);
        next();
      }}
    />
  );
};
