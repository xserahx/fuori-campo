<script lang="ts">
    import type { Snippet } from 'svelte';

    let { children, class: className = '' } = $props<{
        children: Snippet;
        class?: string;
    }>();
</script>

<span class="button-label {className}">
    {@render children()}
</span>

<style>
    .button-label {
        display: inline-flex;
        align-items: center;
        justify-content: center;

        text-align: center;
        text-box-trim: both;
        text-box-edge: cap alphabetic;

        font-family: var(--font-display);
        font-size: var(--ts-nav-link-size, 24px);
        font-weight: var(--ts-nav-link-weight, 500);

        line-height: 1;
        transform: translateY(0.3px);

        color: inherit;
        transition: color 150ms ease;
    }

    @media (max-width: 599px) {
        .button-label {
            font-size: var(--ts-navigation-size, 16px);
            font-weight: var(--ts-navigation-weight, 700);
            line-height: 1;
            transform: translateY(0.2px);
        }
    }
</style>
