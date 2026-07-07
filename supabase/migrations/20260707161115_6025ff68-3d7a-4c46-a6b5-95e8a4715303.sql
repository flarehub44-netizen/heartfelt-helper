
-- Reforçar policies de storage: garantir que UPDATE não permita mover arquivos para pasta de outro usuário
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own cover" ON storage.objects;
CREATE POLICY "Users can update their own cover" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'covers' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'covers' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Creators can update their content" ON storage.objects;
CREATE POLICY "Creators can update their content" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'content' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'content' AND (auth.uid())::text = (storage.foldername(name))[1]);
