import type { MetadataRoute } from 'next';
import { siteUrl } from '@/content/url';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/api/admin','/api/media']},sitemap:`${siteUrl}/sitemap.xml`}}
