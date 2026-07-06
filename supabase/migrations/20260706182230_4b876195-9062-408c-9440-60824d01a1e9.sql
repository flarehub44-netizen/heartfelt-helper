
-- platform_settings: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;
CREATE POLICY "Authenticated can read settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

-- post_likes: restrict SELECT to own likes
DROP POLICY IF EXISTS "Anyone can view post likes count via posts" ON public.post_likes;
CREATE POLICY "Users can view their own likes"
  ON public.post_likes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- storage.objects: tier policy must also honor PPV unlock
DROP POLICY IF EXISTS "Subscribers can view creator content by tier" ON storage.objects;
CREATE POLICY "Subscribers can view creator content by tier"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1
        FROM posts po
        JOIN subscriptions s
          ON s.creator_id = po.creator_id AND s.fan_id = auth.uid()
        WHERE po.media_url LIKE ('%' || objects.name)
          AND s.active = true
          AND (s.expires_at IS NULL OR s.expires_at > now())
          AND plan_rank(s.plan) >= plan_rank(po.min_plan)
          AND (
            COALESCE(po.ppv_price, 0) = 0
            OR EXISTS (
              SELECT 1 FROM post_unlocks pu
              WHERE pu.post_id = po.id AND pu.user_id = auth.uid()
            )
          )
      )
    )
  );
