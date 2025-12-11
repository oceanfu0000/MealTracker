import React from 'react';
import { cn } from '../../lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
        const variants = {
            primary: "bg-sky-500 text-white shadow-lg hover:shadow-sky-500/25 hover:bg-sky-400",
            secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
            ghost: "hover:bg-white/5 text-slate-300 hover:text-white"
        };

        const sizes = {
            sm: "h-8 px-3 text-sm",
            md: "h-10 px-4",
            lg: "h-12 px-6 text-lg",
            icon: "h-10 w-10 p-2 flex items-center justify-center"
        };

        // Since we aren't using Tailwind utility classes for colors yet in theme.css (except vars),
        // I will use inline styles or standard classes driven by the theme.
        // Wait, I said I'd use standard CSS. `bg-sky-500` is Tailwind.
        // I should stick to my `theme.css`.
        // Correcting to use standard classes and style objects or clsx with custom classes.

        // Actually, I installed `tailwind-merge` and `clsx`. The user prompt said:
        // "Avoid using TailwindCSS unless the USER explicitly requests it". 
        // BUT I added it in the plan... 
        // I should strictly follow the prompt. "Vanilla CSS".

        // Redo: Use CSS modules or BEM-like classes in index.css or just style helper.
        // I'll define `.btn`, `.btn-primary` in `index.css` or `components.css`.

        return (
            <motion.button
                ref={ref}
                className={cn(
                    "btn",
                    `btn-${variant}`,
                    `btn-${size}`,
                    className
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);
Button.displayName = "Button";
