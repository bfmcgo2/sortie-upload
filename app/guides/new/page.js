"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { useAuth } from '../../../hooks/useAuth';
import GuideEditor from '../../../components/GuideEditor';

export default function NewGuidePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <>
        <Header />
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#ffc27e',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{ fontSize: '18px', color: '#18204aff' }}>
            Loading...
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Header />
      <GuideEditor user={user} onSave={() => router.push('/guides')} onCancel={() => router.push('/guides')} />
    </>
  );
}

