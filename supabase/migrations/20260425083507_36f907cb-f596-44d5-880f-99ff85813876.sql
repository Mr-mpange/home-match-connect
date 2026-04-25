-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('user', 'vendor', 'admin');
CREATE TYPE public.room_type AS ENUM ('private_room', 'shared_room', 'studio', 'entire_place');
CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'cancelled');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.payment_status AS ENUM ('held', 'released', 'refunded', 'failed');
CREATE TYPE public.cleanliness_level AS ENUM ('relaxed', 'average', 'tidy', 'very_tidy');
CREATE TYPE public.sleep_schedule AS ENUM ('early_bird', 'average', 'night_owl');
CREATE TYPE public.guest_frequency AS ENUM ('never', 'rarely', 'sometimes', 'often');

-- =========================================================
-- UTILITY: updated_at trigger function
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  -- Lifestyle preferences for matching
  budget_min INTEGER,
  budget_max INTEGER,
  cleanliness public.cleanliness_level,
  sleep_schedule public.sleep_schedule,
  smoking BOOLEAN DEFAULT false,
  guest_frequency public.guest_frequency,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER ROLES (separate table to prevent privilege escalation)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role checker
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================================================
-- LISTINGS
-- =========================================================
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  room_type public.room_type NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_location ON public.listings (location);
CREATE INDEX idx_listings_price ON public.listings (price);
CREATE INDEX idx_listings_room_type ON public.listings (room_type);
CREATE INDEX idx_listings_vendor ON public.listings (vendor_id);
CREATE INDEX idx_listings_active ON public.listings (is_active);

CREATE TRIGGER listings_set_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- BOOKINGS
-- =========================================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.booking_status NOT NULL DEFAULT 'pending',
  amount INTEGER NOT NULL CHECK (amount >= 0),
  message TEXT,
  user_confirmed BOOLEAN NOT NULL DEFAULT false,
  vendor_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevent duplicate active bookings per user/listing
  UNIQUE (listing_id, user_id, status)
);

CREATE INDEX idx_bookings_user ON public.bookings (user_id);
CREATE INDEX idx_bookings_vendor ON public.bookings (vendor_id);
CREATE INDEX idx_bookings_listing ON public.bookings (listing_id);
CREATE INDEX idx_bookings_status ON public.bookings (status);

CREATE TRIGGER bookings_set_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- KYC VERIFICATIONS
-- =========================================================
CREATE TABLE public.kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  id_document_path TEXT NOT NULL,
  selfie_path TEXT,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kyc_status ON public.kyc_verifications (status);

CREATE TRIGGER kyc_set_updated_at
BEFORE UPDATE ON public.kyc_verifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- PAYMENTS (mock escrow)
-- =========================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status public.payment_status NOT NULL DEFAULT 'held',
  reference TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  audit_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user ON public.payments (user_id);
CREATE INDEX idx_payments_vendor ON public.payments (vendor_id);
CREATE INDEX idx_payments_status ON public.payments (status);

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow self-promotion to vendor (so users can become vendors).
-- Admin role can NOT be self-assigned because policy restricts role value.
CREATE POLICY "Users can self-assign vendor role"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id AND role = 'vendor');

-- listings
CREATE POLICY "Anyone can view active listings"
ON public.listings FOR SELECT
USING (is_active = true OR auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can insert own listings"
ON public.listings FOR INSERT
WITH CHECK (auth.uid() = vendor_id AND public.has_role(auth.uid(), 'vendor'));

CREATE POLICY "Vendors can update own listings"
ON public.listings FOR UPDATE
USING (auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can delete own listings"
ON public.listings FOR DELETE
USING (auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));

-- bookings
CREATE POLICY "Users see their bookings; vendors see bookings on their listings"
ON public.bookings FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() = vendor_id
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create their own bookings"
ON public.bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Booking parties can update booking"
ON public.bookings FOR UPDATE
USING (
  auth.uid() = user_id
  OR auth.uid() = vendor_id
  OR public.has_role(auth.uid(), 'admin')
);

-- kyc
CREATE POLICY "Users can view own kyc; admins view all"
ON public.kyc_verifications FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can submit own kyc"
ON public.kyc_verifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending kyc"
ON public.kyc_verifications FOR UPDATE
USING (
  (auth.uid() = user_id AND status = 'pending')
  OR public.has_role(auth.uid(), 'admin')
);

-- payments
CREATE POLICY "Booking parties and admins can view payments"
ON public.payments FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() = vendor_id
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create payment for their booking"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Updates restricted to admin (server-side flow uses service role / edge function).
CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('listing-images', 'listing-images', true),
  ('avatars', 'avatars', true),
  ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- listing-images: public read, vendor write own folder
CREATE POLICY "Public can view listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

CREATE POLICY "Vendors can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Vendors can update own listing images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Vendors can delete own listing images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- avatars: public read, owner write
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- kyc-documents: private; owner + admin read, owner write
CREATE POLICY "Users can view own kyc files; admins all"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can upload own kyc files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);