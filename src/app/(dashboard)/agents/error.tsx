"use client"
import { ErrorState } from "@/components/error-state";

const ErrorPage = () => {
    return (
        <ErrorState
            title="Something went wrong"
            description="There was an error loading the agents. Please try again."
        />
    );
}

export default ErrorPage;