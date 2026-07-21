--
-- PostgreSQL database dump
--

\restrict bbzBX86HChfcklIoCcMeVNsvvCtLhf9wbJqu9o5hdEgjp8xdXKGhyqPx9L1xWqB

-- Dumped from database version 15.18 (Debian 15.18-1.pgdg13+1)
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: sheetapp_user
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'paid',
    'cancelled',
    'refunded'
);


ALTER TYPE public.order_status OWNER TO sheetapp_user;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: sheetapp_user
--

CREATE TYPE public.user_role AS ENUM (
    'customer',
    'admin'
);


ALTER TYPE public.user_role OWNER TO sheetapp_user;

--
-- Name: find_user_by_email(text); Type: FUNCTION; Schema: public; Owner: sheetapp_user
--

CREATE FUNCTION public.find_user_by_email(p_email text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find existing profile by email
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = p_email
  LIMIT 1;
  
  -- If not found, check auth.users
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email
    LIMIT 1;
  END IF;
  
  RETURN v_user_id;
END;
$$;


ALTER FUNCTION public.find_user_by_email(p_email text) OWNER TO sheetapp_user;

--
-- Name: FUNCTION find_user_by_email(p_email text); Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON FUNCTION public.find_user_by_email(p_email text) IS 'Helper for auto-enrollment: finds user UUID from email';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: sheetapp_user
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Insert into profiles table with data from auth.users
    INSERT INTO public.profiles (
        id,
        email,
        name,
        avatar_url,
        created_via,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        -- Try to get full_name from metadata, fallback to name or email username
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'user_name',
            split_part(NEW.email, '@', 1)
        ),
        -- Get avatar URL from OAuth provider
        NEW.raw_user_meta_data->>'avatar_url',
        -- Track how the profile was created
        COALESCE(
            -- OAuth provider (google.com, facebook.com, etc.)
            NEW.raw_app_meta_data->>'provider',
            'email'
        ),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO sheetapp_user;

--
-- Name: update_service_activations_updated_at(); Type: FUNCTION; Schema: public; Owner: sheetapp_user
--

CREATE FUNCTION public.update_service_activations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_service_activations_updated_at() OWNER TO sheetapp_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: sheetapp_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO sheetapp_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: affiliate_requests; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.affiliate_requests (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    phone text,
    status text DEFAULT 'pending'::text,
    scope text
);


ALTER TABLE public.affiliate_requests OWNER TO sheetapp_user;

--
-- Name: affiliate_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.affiliate_requests ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.affiliate_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.bookings (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    content text,
    status text DEFAULT 'new'::text,
    user_id uuid
);


ALTER TABLE public.bookings OWNER TO sheetapp_user;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.bookings ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.bookings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.categories OWNER TO sheetapp_user;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.categories ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: chapters; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.chapters (
    id bigint NOT NULL,
    product_id bigint,
    title text NOT NULL,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.chapters OWNER TO sheetapp_user;

--
-- Name: chapters_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.chapters ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.chapters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.comments (
    id bigint NOT NULL,
    post_id bigint,
    user_name text NOT NULL,
    user_avatar text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.comments OWNER TO sheetapp_user;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.comments ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.coupons (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    code text NOT NULL,
    discount text NOT NULL,
    description text,
    expiration_date date,
    is_active boolean DEFAULT true
);


ALTER TABLE public.coupons OWNER TO sheetapp_user;

--
-- Name: coupons_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.coupons ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.coupons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.enrollments (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    product_id bigint NOT NULL,
    order_id text NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now(),
    progress integer DEFAULT 0,
    completed_at timestamp with time zone
);


ALTER TABLE public.enrollments OWNER TO sheetapp_user;

--
-- Name: TABLE enrollments; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.enrollments IS 'User enrollments in courses/products after payment';


--
-- Name: COLUMN enrollments.progress; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.enrollments.progress IS 'Course completion progress 0-100';


--
-- Name: enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.enrollments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enrollments_id_seq OWNER TO sheetapp_user;

--
-- Name: enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.enrollments_id_seq OWNED BY public.enrollments.id;


--
-- Name: failed_enrollments; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.failed_enrollments (
    id bigint NOT NULL,
    order_id text NOT NULL,
    customer_email text,
    error_message text,
    error_details jsonb,
    retry_count integer DEFAULT 0,
    last_retry_at timestamp with time zone,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.failed_enrollments OWNER TO sheetapp_user;

--
-- Name: TABLE failed_enrollments; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.failed_enrollments IS 'Failed auto-enrollments for manual review and retry';


--
-- Name: failed_enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.failed_enrollments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failed_enrollments_id_seq OWNER TO sheetapp_user;

--
-- Name: failed_enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.failed_enrollments_id_seq OWNED BY public.failed_enrollments.id;


--
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.feedbacks (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid,
    content text NOT NULL,
    type text DEFAULT 'general'::text
);


ALTER TABLE public.feedbacks OWNER TO sheetapp_user;

--
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.feedbacks ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.feedbacks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: filters; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.filters (
    id bigint NOT NULL,
    type text NOT NULL,
    group_name text NOT NULL,
    tag_name text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.filters OWNER TO sheetapp_user;

--
-- Name: filters_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.filters ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.filters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: instructors; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.instructors (
    id bigint NOT NULL,
    name text NOT NULL,
    bio text,
    avatar_url text,
    rating numeric DEFAULT 5.0,
    title text,
    email text,
    phone text,
    address text,
    skills text[],
    experiences jsonb
);


ALTER TABLE public.instructors OWNER TO sheetapp_user;

--
-- Name: instructors_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.instructors ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.instructors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.leads (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    message text,
    status text DEFAULT 'new'::text
);


ALTER TABLE public.leads OWNER TO sheetapp_user;

--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.leads ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.leads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.lessons (
    id bigint NOT NULL,
    chapter_id bigint,
    title text NOT NULL,
    duration text,
    video_url text,
    is_preview boolean DEFAULT false,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.lessons OWNER TO sheetapp_user;

--
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.lessons ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.lessons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text,
    is_read boolean DEFAULT false,
    type text DEFAULT 'system'::text
);


ALTER TABLE public.notifications OWNER TO sheetapp_user;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.notifications ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.order_items (
    id bigint NOT NULL,
    order_id uuid NOT NULL,
    product_id bigint NOT NULL,
    price_at_purchase numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.order_items OWNER TO sheetapp_user;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.order_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    total_amount numeric NOT NULL,
    status public.order_status DEFAULT 'pending'::public.order_status,
    payment_qr_code text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    coupon_code text,
    payos_order_code text,
    payos_payment_link text,
    payment_method text DEFAULT 'bank_transfer'::text,
    paid_at timestamp without time zone,
    transaction_id text,
    payment_link_id text,
    payment_url text,
    payment_expires_at timestamp without time zone,
    order_id text,
    customer_email text,
    customer_name text,
    customer_phone text,
    updated_at timestamp without time zone
);


ALTER TABLE public.orders OWNER TO sheetapp_user;

--
-- Name: COLUMN orders.paid_at; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.orders.paid_at IS 'Timestamp when payment was confirmed';


--
-- Name: COLUMN orders.payment_link_id; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.orders.payment_link_id IS 'PayOS payment link ID';


--
-- Name: COLUMN orders.payment_url; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.orders.payment_url IS 'PayOS checkout URL';


--
-- Name: partners; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.partners (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text NOT NULL,
    logo_url text NOT NULL,
    website_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.partners OWNER TO sheetapp_user;

--
-- Name: partners_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.partners ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.partners_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: post_categories; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.post_categories (
    id bigint NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.post_categories OWNER TO sheetapp_user;

--
-- Name: post_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.post_categories ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.post_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.posts (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content text,
    thumbnail_url text,
    views integer DEFAULT 0,
    is_published boolean DEFAULT true,
    content_html text,
    category_id bigint,
    video_url text,
    tags text[],
    author_name text DEFAULT 'Admin'::text
);


ALTER TABLE public.posts OWNER TO sheetapp_user;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.posts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_benefits; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.product_benefits (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_benefits OWNER TO sheetapp_user;

--
-- Name: TABLE product_benefits; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.product_benefits IS 'Benefits for each product (Lợi ích mang lại)';


--
-- Name: product_benefits_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.product_benefits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_benefits_id_seq OWNER TO sheetapp_user;

--
-- Name: product_benefits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.product_benefits_id_seq OWNED BY public.product_benefits.id;


--
-- Name: product_deployment_steps; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.product_deployment_steps (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    step_number integer NOT NULL,
    title text NOT NULL,
    description text,
    estimated_duration text,
    video_url text,
    documentation_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_deployment_steps OWNER TO sheetapp_user;

--
-- Name: TABLE product_deployment_steps; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.product_deployment_steps IS 'Step-by-step deployment process for each product (Quy trình triển khai)';


--
-- Name: product_deployment_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.product_deployment_steps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_deployment_steps_id_seq OWNER TO sheetapp_user;

--
-- Name: product_deployment_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.product_deployment_steps_id_seq OWNED BY public.product_deployment_steps.id;


--
-- Name: product_experts; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.product_experts (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    expert_name text NOT NULL,
    expert_title text,
    expert_avatar_url text,
    expert_email text,
    expert_phone text,
    expert_bio text,
    role text,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_experts OWNER TO sheetapp_user;

--
-- Name: TABLE product_experts; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.product_experts IS 'Experts/specialists assigned to products (Chuyên gia phụ trách)';


--
-- Name: product_experts_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.product_experts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_experts_id_seq OWNER TO sheetapp_user;

--
-- Name: product_experts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.product_experts_id_seq OWNED BY public.product_experts.id;


--
-- Name: product_features; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.product_features (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    icon text,
    title text NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_features OWNER TO sheetapp_user;

--
-- Name: TABLE product_features; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.product_features IS 'Highlighted features for each product (Tính năng nổi bật)';


--
-- Name: product_features_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.product_features_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_features_id_seq OWNER TO sheetapp_user;

--
-- Name: product_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.product_features_id_seq OWNED BY public.product_features.id;


--
-- Name: product_pricing_tiers; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.product_pricing_tiers (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    tier_name text NOT NULL,
    tier_slug text NOT NULL,
    tier_label text,
    tier_icon text,
    price numeric DEFAULT 0 NOT NULL,
    old_price numeric,
    billing_cycle text,
    billing_period_text text,
    is_recommended boolean DEFAULT false,
    cta_text text DEFAULT 'Chọn gói này'::text,
    cta_variant text DEFAULT 'primary'::text,
    description text,
    order_index integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_pricing_tiers OWNER TO sheetapp_user;

--
-- Name: TABLE product_pricing_tiers; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.product_pricing_tiers IS 'Pricing packages/tiers for products (e.g., Basic, Pro, Premium)';


--
-- Name: COLUMN product_pricing_tiers.is_recommended; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.product_pricing_tiers.is_recommended IS 'Highlight this tier as "Được chọn nhiều" or "Phổ biến"';


--
-- Name: COLUMN product_pricing_tiers.cta_variant; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.product_pricing_tiers.cta_variant IS 'Button style: primary (blue), secondary (gray), outline (border only)';


--
-- Name: product_pricing_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.product_pricing_tiers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_pricing_tiers_id_seq OWNER TO sheetapp_user;

--
-- Name: product_pricing_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.product_pricing_tiers_id_seq OWNED BY public.product_pricing_tiers.id;


--
-- Name: product_requirements; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.product_requirements (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    category text,
    title text NOT NULL,
    description text,
    is_required boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_requirements OWNER TO sheetapp_user;

--
-- Name: TABLE product_requirements; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.product_requirements IS 'System requirements for each product (Yêu cầu hệ thống)';


--
-- Name: product_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.product_requirements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_requirements_id_seq OWNER TO sheetapp_user;

--
-- Name: product_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.product_requirements_id_seq OWNED BY public.product_requirements.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.products (
    id bigint NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    content_html text,
    price numeric DEFAULT 0 NOT NULL,
    old_price numeric,
    thumbnail_url text,
    demo_link text,
    is_active boolean DEFAULT true,
    category_id bigint,
    file_source_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    type text DEFAULT 'template'::text,
    category text DEFAULT 'General'::text,
    is_featured boolean DEFAULT true,
    video_url text,
    instructor_id bigint,
    benefits text[],
    audience text[],
    total_duration text,
    total_lessons integer,
    related_ids bigint[],
    gallery text[],
    industry text,
    industry_group text,
    industry_tag text,
    tech_group text,
    tech_tag text,
    activated boolean DEFAULT true,
    show_on_homepage boolean DEFAULT false,
    has_pricing_tiers boolean DEFAULT false
);


ALTER TABLE public.products OWNER TO sheetapp_user;

--
-- Name: COLUMN products.activated; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.products.activated IS 'Controls product visibility on website (true = shown, false = hidden)';


--
-- Name: COLUMN products.show_on_homepage; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.products.show_on_homepage IS 'Display product on homepage featured section';


--
-- Name: COLUMN products.has_pricing_tiers; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.products.has_pricing_tiers IS 'Enable tier-based pricing display (Gói 1, Gói 2, Gói 3)';


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.products ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    role public.user_role DEFAULT 'customer'::public.user_role,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    phone text,
    created_via text DEFAULT 'manual'::text,
    name text,
    updated_at timestamp with time zone DEFAULT now(),
    gender text,
    job text
);


ALTER TABLE public.profiles OWNER TO sheetapp_user;

--
-- Name: COLUMN profiles.phone; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.profiles.phone IS 'User phone number (optional)';


--
-- Name: COLUMN profiles.created_via; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.profiles.created_via IS 'How profile was created: manual, purchase, social, etc.';


--
-- Name: service_activations; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.service_activations (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    product_id bigint NOT NULL,
    order_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    assigned_to uuid,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    customer_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.service_activations OWNER TO sheetapp_user;

--
-- Name: TABLE service_activations; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.service_activations IS 'Tracks service product activations and delivery status';


--
-- Name: COLUMN service_activations.status; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.service_activations.status IS 'Service delivery status: pending, in_progress, completed, cancelled';


--
-- Name: COLUMN service_activations.assigned_to; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.service_activations.assigned_to IS 'Staff member assigned to deliver this service';


--
-- Name: COLUMN service_activations.notes; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.service_activations.notes IS 'Internal notes for service delivery (admin only)';


--
-- Name: COLUMN service_activations.customer_notes; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.service_activations.customer_notes IS 'Customer requirements and preferences';


--
-- Name: service_activations_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.service_activations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_activations_id_seq OWNER TO sheetapp_user;

--
-- Name: service_activations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.service_activations_id_seq OWNED BY public.service_activations.id;


--
-- Name: service_updates; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.service_updates (
    id bigint NOT NULL,
    service_activation_id bigint NOT NULL,
    update_type text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.service_updates OWNER TO sheetapp_user;

--
-- Name: TABLE service_updates; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.service_updates IS 'Timeline of updates for service activations';


--
-- Name: COLUMN service_updates.update_type; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.service_updates.update_type IS 'Type of update: status_change, note_added, file_uploaded, scheduled, assigned';


--
-- Name: service_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.service_updates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_updates_id_seq OWNER TO sheetapp_user;

--
-- Name: service_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.service_updates_id_seq OWNED BY public.service_updates.id;


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.testimonials (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name text NOT NULL,
    customer_role text,
    content text NOT NULL,
    avatar_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.testimonials OWNER TO sheetapp_user;

--
-- Name: testimonials_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.testimonials ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.testimonials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tier_feature_values; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.tier_feature_values (
    id bigint NOT NULL,
    tier_id bigint NOT NULL,
    feature_name text NOT NULL,
    feature_category text,
    value_type text NOT NULL,
    value_number integer,
    value_boolean boolean,
    value_text text,
    value_badge_color text,
    display_text text,
    tooltip text,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tier_feature_values_value_type_check CHECK ((value_type = ANY (ARRAY['number'::text, 'boolean'::text, 'text'::text, 'badge'::text])))
);


ALTER TABLE public.tier_feature_values OWNER TO sheetapp_user;

--
-- Name: TABLE tier_feature_values; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.tier_feature_values IS 'Feature comparison values for each pricing tier';


--
-- Name: COLUMN tier_feature_values.value_type; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON COLUMN public.tier_feature_values.value_type IS 'Type of value: number (3, 200), boolean (✓/—), text (Cơ bản), badge (VIP with color)';


--
-- Name: tier_feature_values_id_seq; Type: SEQUENCE; Schema: public; Owner: sheetapp_user
--

CREATE SEQUENCE public.tier_feature_values_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tier_feature_values_id_seq OWNER TO sheetapp_user;

--
-- Name: tier_feature_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sheetapp_user
--

ALTER SEQUENCE public.tier_feature_values_id_seq OWNED BY public.tier_feature_values.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: sheetapp_user
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id text NOT NULL,
    transaction_id text NOT NULL,
    payment_link_id text,
    amount integer NOT NULL,
    currency text DEFAULT 'VND'::text,
    status text NOT NULL,
    payment_method text,
    bank_code text,
    account_number text,
    created_at timestamp without time zone DEFAULT now(),
    paid_at timestamp without time zone,
    webhook_data jsonb,
    gateway text DEFAULT 'payos'::text,
    gateway_data jsonb,
    payos_order_code bigint,
    payer_bank_id text,
    payer_bank_name text,
    payer_account_number text,
    payer_account_name text,
    payment_datetime timestamp with time zone
);


ALTER TABLE public.transactions OWNER TO sheetapp_user;

--
-- Name: TABLE transactions; Type: COMMENT; Schema: public; Owner: sheetapp_user
--

COMMENT ON TABLE public.transactions IS 'Payment transaction history from PayOS webhooks';


--
-- Name: enrollments id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.enrollments ALTER COLUMN id SET DEFAULT nextval('public.enrollments_id_seq'::regclass);


--
-- Name: failed_enrollments id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.failed_enrollments ALTER COLUMN id SET DEFAULT nextval('public.failed_enrollments_id_seq'::regclass);


--
-- Name: product_benefits id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_benefits ALTER COLUMN id SET DEFAULT nextval('public.product_benefits_id_seq'::regclass);


--
-- Name: product_deployment_steps id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_deployment_steps ALTER COLUMN id SET DEFAULT nextval('public.product_deployment_steps_id_seq'::regclass);


--
-- Name: product_experts id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_experts ALTER COLUMN id SET DEFAULT nextval('public.product_experts_id_seq'::regclass);


--
-- Name: product_features id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_features ALTER COLUMN id SET DEFAULT nextval('public.product_features_id_seq'::regclass);


--
-- Name: product_pricing_tiers id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_pricing_tiers ALTER COLUMN id SET DEFAULT nextval('public.product_pricing_tiers_id_seq'::regclass);


--
-- Name: product_requirements id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_requirements ALTER COLUMN id SET DEFAULT nextval('public.product_requirements_id_seq'::regclass);


--
-- Name: service_activations id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_activations ALTER COLUMN id SET DEFAULT nextval('public.service_activations_id_seq'::regclass);


--
-- Name: service_updates id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_updates ALTER COLUMN id SET DEFAULT nextval('public.service_updates_id_seq'::regclass);


--
-- Name: tier_feature_values id; Type: DEFAULT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.tier_feature_values ALTER COLUMN id SET DEFAULT nextval('public.tier_feature_values_id_seq'::regclass);


--
-- Name: affiliate_requests affiliate_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.affiliate_requests
    ADD CONSTRAINT affiliate_requests_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: failed_enrollments failed_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.failed_enrollments
    ADD CONSTRAINT failed_enrollments_pkey PRIMARY KEY (id);


--
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- Name: filters filters_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.filters
    ADD CONSTRAINT filters_pkey PRIMARY KEY (id);


--
-- Name: instructors instructors_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.instructors
    ADD CONSTRAINT instructors_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_id_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_id_key UNIQUE (order_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: post_categories post_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.post_categories
    ADD CONSTRAINT post_categories_pkey PRIMARY KEY (id);


--
-- Name: post_categories post_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.post_categories
    ADD CONSTRAINT post_categories_slug_key UNIQUE (slug);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: product_benefits product_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_benefits
    ADD CONSTRAINT product_benefits_pkey PRIMARY KEY (id);


--
-- Name: product_deployment_steps product_deployment_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_deployment_steps
    ADD CONSTRAINT product_deployment_steps_pkey PRIMARY KEY (id);


--
-- Name: product_deployment_steps product_deployment_steps_product_id_step_number_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_deployment_steps
    ADD CONSTRAINT product_deployment_steps_product_id_step_number_key UNIQUE (product_id, step_number);


--
-- Name: product_experts product_experts_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_experts
    ADD CONSTRAINT product_experts_pkey PRIMARY KEY (id);


--
-- Name: product_features product_features_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_features
    ADD CONSTRAINT product_features_pkey PRIMARY KEY (id);


--
-- Name: product_pricing_tiers product_pricing_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_pricing_tiers
    ADD CONSTRAINT product_pricing_tiers_pkey PRIMARY KEY (id);


--
-- Name: product_pricing_tiers product_pricing_tiers_product_id_tier_slug_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_pricing_tiers
    ADD CONSTRAINT product_pricing_tiers_product_id_tier_slug_key UNIQUE (product_id, tier_slug);


--
-- Name: product_requirements product_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_requirements
    ADD CONSTRAINT product_requirements_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: service_activations service_activations_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_activations
    ADD CONSTRAINT service_activations_pkey PRIMARY KEY (id);


--
-- Name: service_activations service_activations_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_activations
    ADD CONSTRAINT service_activations_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: service_updates service_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_updates
    ADD CONSTRAINT service_updates_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: tier_feature_values tier_feature_values_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.tier_feature_values
    ADD CONSTRAINT tier_feature_values_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_transaction_id_key UNIQUE (transaction_id);


--
-- Name: idx_enrollments_order_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_enrollments_order_id ON public.enrollments USING btree (order_id);


--
-- Name: idx_enrollments_product_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_enrollments_product_id ON public.enrollments USING btree (product_id);


--
-- Name: idx_enrollments_user_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_enrollments_user_id ON public.enrollments USING btree (user_id);


--
-- Name: idx_enrollments_user_product; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_enrollments_user_product ON public.enrollments USING btree (user_id, product_id);


--
-- Name: idx_failed_enrollments_email; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_failed_enrollments_email ON public.failed_enrollments USING btree (customer_email);


--
-- Name: idx_failed_enrollments_order_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_failed_enrollments_order_id ON public.failed_enrollments USING btree (order_id);


--
-- Name: idx_failed_enrollments_resolved; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_failed_enrollments_resolved ON public.failed_enrollments USING btree (resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_failed_enrollments_unresolved; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_failed_enrollments_unresolved ON public.failed_enrollments USING btree (resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_order_items_order_product; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_order_items_order_product ON public.order_items USING btree (order_id, product_id);


--
-- Name: idx_orders_customer_email; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_orders_customer_email ON public.orders USING btree (customer_email);


--
-- Name: idx_orders_order_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_orders_order_id ON public.orders USING btree (order_id);


--
-- Name: idx_orders_payment_link_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_orders_payment_link_id ON public.orders USING btree (payment_link_id);


--
-- Name: idx_orders_payos_order_code; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_orders_payos_order_code ON public.orders USING btree (payos_order_code);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_transaction_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_orders_transaction_id ON public.orders USING btree (transaction_id);


--
-- Name: idx_pricing_tiers_product_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_pricing_tiers_product_id ON public.product_pricing_tiers USING btree (product_id, order_index);


--
-- Name: idx_pricing_tiers_recommended; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_pricing_tiers_recommended ON public.product_pricing_tiers USING btree (product_id, is_recommended) WHERE (is_recommended = true);


--
-- Name: idx_product_benefits_product_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_product_benefits_product_id ON public.product_benefits USING btree (product_id, order_index);


--
-- Name: idx_product_deployment_steps_product_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_product_deployment_steps_product_id ON public.product_deployment_steps USING btree (product_id, step_number);


--
-- Name: idx_product_experts_primary; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_product_experts_primary ON public.product_experts USING btree (product_id, is_primary) WHERE (is_primary = true);


--
-- Name: idx_product_experts_product_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_product_experts_product_id ON public.product_experts USING btree (product_id);


--
-- Name: idx_product_features_product_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_product_features_product_id ON public.product_features USING btree (product_id, order_index);


--
-- Name: idx_product_requirements_category; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_product_requirements_category ON public.product_requirements USING btree (category);


--
-- Name: idx_product_requirements_product_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_product_requirements_product_id ON public.product_requirements USING btree (product_id, order_index);


--
-- Name: idx_products_activated; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_products_activated ON public.products USING btree (activated);


--
-- Name: idx_products_has_pricing_tiers; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_products_has_pricing_tiers ON public.products USING btree (has_pricing_tiers) WHERE (has_pricing_tiers = true);


--
-- Name: idx_products_show_homepage; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_products_show_homepage ON public.products USING btree (show_on_homepage) WHERE (show_on_homepage = true);


--
-- Name: idx_profiles_created_via; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_profiles_created_via ON public.profiles USING btree (created_via);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


--
-- Name: idx_profiles_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_profiles_id ON public.profiles USING btree (id);


--
-- Name: idx_service_activations_assigned_to; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_service_activations_assigned_to ON public.service_activations USING btree (assigned_to) WHERE (assigned_to IS NOT NULL);


--
-- Name: idx_service_activations_created_at; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_service_activations_created_at ON public.service_activations USING btree (created_at DESC);


--
-- Name: idx_service_activations_order_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_service_activations_order_id ON public.service_activations USING btree (order_id);


--
-- Name: idx_service_activations_pending; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_service_activations_pending ON public.service_activations USING btree (created_at DESC) WHERE (status = 'pending'::text);


--
-- Name: idx_service_activations_product_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_service_activations_product_id ON public.service_activations USING btree (product_id);


--
-- Name: idx_service_activations_status; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_service_activations_status ON public.service_activations USING btree (status);


--
-- Name: idx_service_activations_user_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_service_activations_user_id ON public.service_activations USING btree (user_id);


--
-- Name: idx_service_updates_activation_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_service_updates_activation_id ON public.service_updates USING btree (service_activation_id, created_at DESC);


--
-- Name: idx_service_updates_created_by; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_service_updates_created_by ON public.service_updates USING btree (created_by);


--
-- Name: idx_tier_feature_values_category; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_tier_feature_values_category ON public.tier_feature_values USING btree (feature_category);


--
-- Name: idx_tier_feature_values_tier_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_tier_feature_values_tier_id ON public.tier_feature_values USING btree (tier_id, order_index);


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at DESC);


--
-- Name: idx_transactions_order_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_transactions_order_id ON public.transactions USING btree (order_id);


--
-- Name: idx_transactions_payos_order_code; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_transactions_payos_order_code ON public.transactions USING btree (payos_order_code);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- Name: idx_transactions_transaction_id; Type: INDEX; Schema: public; Owner: sheetapp_user
--

CREATE INDEX idx_transactions_transaction_id ON public.transactions USING btree (transaction_id);


--
-- Name: service_activations trigger_update_service_activations_updated_at; Type: TRIGGER; Schema: public; Owner: sheetapp_user
--

CREATE TRIGGER trigger_update_service_activations_updated_at BEFORE UPDATE ON public.service_activations FOR EACH ROW EXECUTE FUNCTION public.update_service_activations_updated_at();


--
-- Name: product_pricing_tiers update_pricing_tiers_updated_at; Type: TRIGGER; Schema: public; Owner: sheetapp_user
--

CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON public.product_pricing_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_benefits update_product_benefits_updated_at; Type: TRIGGER; Schema: public; Owner: sheetapp_user
--

CREATE TRIGGER update_product_benefits_updated_at BEFORE UPDATE ON public.product_benefits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_deployment_steps update_product_deployment_steps_updated_at; Type: TRIGGER; Schema: public; Owner: sheetapp_user
--

CREATE TRIGGER update_product_deployment_steps_updated_at BEFORE UPDATE ON public.product_deployment_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_experts update_product_experts_updated_at; Type: TRIGGER; Schema: public; Owner: sheetapp_user
--

CREATE TRIGGER update_product_experts_updated_at BEFORE UPDATE ON public.product_experts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_features update_product_features_updated_at; Type: TRIGGER; Schema: public; Owner: sheetapp_user
--

CREATE TRIGGER update_product_features_updated_at BEFORE UPDATE ON public.product_features FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_requirements update_product_requirements_updated_at; Type: TRIGGER; Schema: public; Owner: sheetapp_user
--

CREATE TRIGGER update_product_requirements_updated_at BEFORE UPDATE ON public.product_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chapters chapters_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: posts posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.post_categories(id);


--
-- Name: product_benefits product_benefits_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_benefits
    ADD CONSTRAINT product_benefits_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_deployment_steps product_deployment_steps_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_deployment_steps
    ADD CONSTRAINT product_deployment_steps_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_experts product_experts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_experts
    ADD CONSTRAINT product_experts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_features product_features_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_features
    ADD CONSTRAINT product_features_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_pricing_tiers product_pricing_tiers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_pricing_tiers
    ADD CONSTRAINT product_pricing_tiers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_requirements product_requirements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.product_requirements
    ADD CONSTRAINT product_requirements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: products products_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.instructors(id);


--
-- Name: service_activations service_activations_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_activations
    ADD CONSTRAINT service_activations_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: service_activations service_activations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_activations
    ADD CONSTRAINT service_activations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: service_activations service_activations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_activations
    ADD CONSTRAINT service_activations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: service_updates service_updates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_updates
    ADD CONSTRAINT service_updates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: service_updates service_updates_service_activation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.service_updates
    ADD CONSTRAINT service_updates_service_activation_id_fkey FOREIGN KEY (service_activation_id) REFERENCES public.service_activations(id) ON DELETE CASCADE;


--
-- Name: tier_feature_values tier_feature_values_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.tier_feature_values
    ADD CONSTRAINT tier_feature_values_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.product_pricing_tiers(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sheetapp_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- Name: leads Cho phép ai cũng được gửi form; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Cho phép ai cũng được gửi form" ON public.leads FOR INSERT WITH CHECK (true);


--
-- Name: leads Chỉ Admin xem được leads; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Chỉ Admin xem được leads" ON public.leads FOR SELECT USING (false);


--
-- Name: categories Public Read Categories; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);


--
-- Name: chapters Public Read Chapters; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Chapters" ON public.chapters FOR SELECT USING (true);


--
-- Name: filters Public Read Filters; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Filters" ON public.filters FOR SELECT USING (true);


--
-- Name: instructors Public Read Instructors; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Instructors" ON public.instructors FOR SELECT USING (true);


--
-- Name: lessons Public Read Lessons; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Lessons" ON public.lessons FOR SELECT USING (true);


--
-- Name: partners Public Read Partners; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Partners" ON public.partners FOR SELECT USING (true);


--
-- Name: post_categories Public Read Post Categories; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Post Categories" ON public.post_categories FOR SELECT USING (true);


--
-- Name: posts Public Read Posts; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);


--
-- Name: products Public Read Products; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);


--
-- Name: testimonials Public Read Testimonials; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public Read Testimonials" ON public.testimonials FOR SELECT USING (true);


--
-- Name: order_items Public can insert order items; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);


--
-- Name: orders Public can insert orders; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);


--
-- Name: partners Public can view active partners; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view active partners" ON public.partners FOR SELECT USING ((is_active = true));


--
-- Name: products Public can view active products; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING ((is_active = true));


--
-- Name: testimonials Public can view active testimonials; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view active testimonials" ON public.testimonials FOR SELECT USING ((is_active = true));


--
-- Name: categories Public can view categories; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);


--
-- Name: chapters Public can view chapters; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view chapters" ON public.chapters FOR SELECT USING (true);


--
-- Name: product_deployment_steps Public can view deployment steps; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view deployment steps" ON public.product_deployment_steps FOR SELECT USING (true);


--
-- Name: instructors Public can view instructors; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view instructors" ON public.instructors FOR SELECT USING (true);


--
-- Name: lessons Public can view lessons; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view lessons" ON public.lessons FOR SELECT USING (true);


--
-- Name: post_categories Public can view post categories; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view post categories" ON public.post_categories FOR SELECT USING (true);


--
-- Name: product_pricing_tiers Public can view pricing tiers; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view pricing tiers" ON public.product_pricing_tiers FOR SELECT USING ((is_active = true));


--
-- Name: product_benefits Public can view product benefits; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view product benefits" ON public.product_benefits FOR SELECT USING (true);


--
-- Name: product_experts Public can view product experts; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view product experts" ON public.product_experts FOR SELECT USING (true);


--
-- Name: product_features Public can view product features; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view product features" ON public.product_features FOR SELECT USING (true);


--
-- Name: product_requirements Public can view product requirements; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view product requirements" ON public.product_requirements FOR SELECT USING (true);


--
-- Name: posts Public can view published posts; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view published posts" ON public.posts FOR SELECT USING ((is_published = true));


--
-- Name: tier_feature_values Public can view tier features; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public can view tier features" ON public.tier_feature_values FOR SELECT USING (true);


--
-- Name: leads Public insert leads; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public insert leads" ON public.leads FOR INSERT WITH CHECK (true);


--
-- Name: partners Public partners are viewable by everyone; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public partners are viewable by everyone" ON public.partners FOR SELECT USING (true);


--
-- Name: posts Public posts are viewable by everyone; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public posts are viewable by everyone" ON public.posts FOR SELECT USING (true);


--
-- Name: products Public products are viewable by everyone; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public products are viewable by everyone" ON public.products FOR SELECT USING (true);


--
-- Name: testimonials Public testimonials are viewable by everyone; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Public testimonials are viewable by everyone" ON public.testimonials FOR SELECT USING (true);


--
-- Name: coupons Read active coupons; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Read active coupons" ON public.coupons FOR SELECT USING ((is_active = true));


--
-- Name: transactions Service role can manage transactions; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role can manage transactions" ON public.transactions USING (true);


--
-- Name: categories Service role manages categories; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages categories" ON public.categories USING (true);


--
-- Name: chapters Service role manages chapters; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages chapters" ON public.chapters USING (true);


--
-- Name: enrollments Service role manages enrollments; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages enrollments" ON public.enrollments USING (true);


--
-- Name: failed_enrollments Service role manages failed enrollments; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages failed enrollments" ON public.failed_enrollments USING (true);


--
-- Name: instructors Service role manages instructors; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages instructors" ON public.instructors USING (true);


--
-- Name: lessons Service role manages lessons; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages lessons" ON public.lessons USING (true);


--
-- Name: partners Service role manages partners; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages partners" ON public.partners USING (true);


--
-- Name: post_categories Service role manages post categories; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages post categories" ON public.post_categories USING (true);


--
-- Name: posts Service role manages posts; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages posts" ON public.posts USING (true);


--
-- Name: products Service role manages products; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages products" ON public.products USING (true);


--
-- Name: service_activations Service role manages service activations; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages service activations" ON public.service_activations USING (true);


--
-- Name: service_updates Service role manages service updates; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages service updates" ON public.service_updates USING (true);


--
-- Name: testimonials Service role manages testimonials; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Service role manages testimonials" ON public.testimonials USING (true);


--
-- Name: transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: sheetapp_user
--

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (true);


--
-- Name: affiliate_requests; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.affiliate_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: chapters; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: failed_enrollments; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.failed_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: feedbacks; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

--
-- Name: filters; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.filters ENABLE ROW LEVEL SECURITY;

--
-- Name: instructors; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: partners; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

--
-- Name: post_categories; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: product_benefits; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.product_benefits ENABLE ROW LEVEL SECURITY;

--
-- Name: product_deployment_steps; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.product_deployment_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: product_experts; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.product_experts ENABLE ROW LEVEL SECURITY;

--
-- Name: product_features; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;

--
-- Name: product_pricing_tiers; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.product_pricing_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: product_requirements; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.product_requirements ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: service_activations; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.service_activations ENABLE ROW LEVEL SECURITY;

--
-- Name: service_updates; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.service_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: testimonials; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

--
-- Name: tier_feature_values; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.tier_feature_values ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: sheetapp_user
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict bbzBX86HChfcklIoCcMeVNsvvCtLhf9wbJqu9o5hdEgjp8xdXKGhyqPx9L1xWqB

