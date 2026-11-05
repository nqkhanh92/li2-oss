-- Add column `default_selected` to table `domains`
ALTER TABLE public.domains
ADD COLUMN IF NOT EXISTS default_selected boolean DEFAULT NULL;

-- Add column `default_domain_id` to table `organizations`
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS default_domain_id uuid DEFAULT NULL;

-- Add foreign key constraint with ON UPDATE/DELETE CASCADE
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_default_domain_id_fkey
FOREIGN KEY (default_domain_id)
REFERENCES public.domains(id)
ON UPDATE CASCADE
ON DELETE SET NULL;
