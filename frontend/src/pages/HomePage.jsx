import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import HeroSection from '../components/home/HeroSection';
import QuickActions from '../components/home/QuickActions';
import Promotions from '../components/home/Promotions';
import PopularRoutes from '../components/home/PopularRoutes';
import LatestNews from '../components/home/LatestNews';
import '../styles/home.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <HeroSection />
      <div className="container">
        <QuickActions />
        <Promotions />
        <PopularRoutes />
        <LatestNews />
      </div>
    </div>
  );
};

export default HomePage;
