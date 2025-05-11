"use client";
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconSun, IconMoonStars } from '@tabler/icons-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeSwitcher() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Tooltip label={theme === 'futuristic' ? 'Switch to Classic Theme' : 'Switch to Futuristic Theme'}>
            <ActionIcon
                onClick={toggleTheme}
                variant="gradient"
                gradient={{ from: theme === 'futuristic' ? '#3a2e5d' : '#228be6', to: theme === 'futuristic' ? '#232b4d' : '#40c057', deg: 90 }}
                size="lg"
                radius="xl"
                style={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
                    zIndex: 1000,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
                }}
            >
                {theme === 'futuristic' ? (
                    <IconSun size={20} color="#fff" />
                ) : (
                    <IconMoonStars size={20} color="#fff" />
                )}
            </ActionIcon>
        </Tooltip>
    );
} 