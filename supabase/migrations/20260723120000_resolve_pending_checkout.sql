-- Allow fans to clear their own abandoned checkout after successful payment
CREATE OR REPLACE FUNCTION public.resolve_pending_checkout(p_creator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM pending_checkouts
  WHERE fan_id = auth.uid()
    AND creator_id = p_creator_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_pending_checkout(uuid) TO authenticated;

DROP POLICY IF EXISTS "Fan deletes own pending checkout" ON public.pending_checkouts;
CREATE POLICY "Fan deletes own pending checkout"
  ON public.pending_checkouts FOR DELETE
  TO authenticated
  USING (auth.uid() = fan_id);
