ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_text_len CHECK (char_length(text) BETWEEN 1 AND 1000);
ALTER TABLE public.messages ADD CONSTRAINT messages_text_len CHECK (char_length(text) BETWEEN 1 AND 2000);
ALTER TABLE public.posts ADD CONSTRAINT posts_text_len CHECK (text IS NULL OR char_length(text) <= 5000);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_len CHECK (bio IS NULL OR char_length(bio) <= 500);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_name_len CHECK (char_length(name) <= 100);
ALTER TABLE public.live_chat_messages ADD CONSTRAINT live_chat_text_len CHECK (char_length(text) BETWEEN 1 AND 500);