
ALTER TABLE public.posts
  ADD CONSTRAINT posts_creator_profile_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subs_creator_profile_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT subs_fan_profile_fkey FOREIGN KEY (fan_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversations
  ADD CONSTRAINT conv_creator_profile_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT conv_fan_profile_fkey FOREIGN KEY (fan_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tiers
  ADD CONSTRAINT tiers_creator_profile_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
