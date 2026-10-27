-- Track sugar alongside calories, protein, carbs and fat.
-- Existing meals and quick items start at 0 g (unknown). The daily sugar target is a limit of
-- 10% of calories (WHO guideline): calories * 0.10 / 4 kcal per gram.

ALTER TABLE public.meal_logs
    ADD COLUMN IF NOT EXISTS sugar numeric NOT NULL DEFAULT 0 CHECK (sugar >= 0);

ALTER TABLE public.quick_items
    ADD COLUMN IF NOT EXISTS sugar_per_unit numeric DEFAULT 0 CHECK (sugar_per_unit >= 0);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'nutrition_targets' AND column_name = 'sugar_target'
    ) THEN
        ALTER TABLE public.nutrition_targets
            ADD COLUMN sugar_target integer NOT NULL DEFAULT 50 CHECK (sugar_target > 0);
        UPDATE public.nutrition_targets
            SET sugar_target = greatest(1, round(calories_target * 0.10 / 4));
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
