import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function AcceptProject() {
  const { inviteToken } = useParams();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#1f2937'
        }}>
          صفحه پذیرش پروژه
        </h1>

        <div style={{ marginBottom: '16px' }}>
          <strong>Token:</strong> {inviteToken || 'بدون توکن'}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong>URL:</strong> {window.location.href}
        </div>

        <p style={{ color: '#10b981', fontSize: '18px', fontWeight: 'bold' }}>
          ✅ صفحه AcceptProject با موفقیت بارگذاری شد!
        </p>

        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#1e40af', margin: 0 }}>
            حالا باید API را برای گرفتن اطلاعات پروژه فراخوانی کنیم
          </p>
        </div>
      </div>
    </div>
  );
}
