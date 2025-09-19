'use client'

import '@ant-design/v5-patch-for-react-19';
import React, { useState } from "react";
import { Form, Input, Checkbox, Button, Card, Typography, message } from "antd";
import styles from "./login.module.scss";
import axios from 'axios';
import { EmailFormType, OtpFormType } from './interface';
import { useRouter } from 'next/navigation';
import Cookies from 'cookies-js';

const { Title } = Typography;


const Login = () => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');

  const router = useRouter()



  const onEmailFinish = async ({ username }: EmailFormType) => {
    try {
      setEmail(username);
      await axios.post('http://192.168.100.200:8000/api/otp/request/', { email: username });
      message.success('OTP sent to your email!');
      setStep('otp');
    } 
    catch (error: any) {
      message.error('Failed to send OTP. Try again.');
      console.error(error);
    }
  };





  const onOtpFinish = async (values: OtpFormType) => {
    try {
      const res = await axios.post('http://192.168.100.200:8000/api/otp/verify/', {
        email: email,
        otp: values.otp
      });
      message.success('Login successful!');
      Cookies.set('access', res.data.access)
      Cookies.set('refresh', res.data.refresh)
      router.push('/home')
      

    }
    catch (error: any) {
      message.error('Invalid OTP. Try again.');
      console.error(error);
    }
  };




  return (
    <div className={styles.loginPageMainContainer}>
      <Card className={styles.loginCard}>
        <Title level={2} className={styles.title}>Welcome Back</Title>

        {step === 'email' && (
          <Form name="emailForm" layout="vertical" style={{ width: "100%" }} initialValues={{ remember: true }} onFinish={onEmailFinish} autoComplete="on" >
            <Form.Item
              label="Email"
              name="username"
              rules={[{ required: true, message: "Please input your email!" }]}
            >
              <Input placeholder="Enter your email" />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked">
              <Checkbox>Remember me</Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className={styles.submitButton} block>
                Send OTP
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 'otp' && (
          <Form key="otpForm" name="otpForm" layout="vertical" style={{ width: "100%" }} onFinish={onOtpFinish} >
            <Form.Item label="OTP" name="otp" rules={[{ required: true, message: "Please input the OTP!" }]} >
              <Input placeholder="Enter OTP" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className={styles.submitButton} block>
                Verify OTP
              </Button>
            </Form.Item>

            <Button type="link" onClick={() => setStep('email')}>
              Back to email
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default Login;