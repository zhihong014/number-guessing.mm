import random
import streamlit as st

st.title("4-Digit Number Guessing Game")

# 1. Generate and remember the secret number across button clicks
if "secret_number" not in st.session_state:
    st.session_state.secret_number = f"{random.randint(0, 9999):04d}"
    st.session_state.game_over = False

# 2. Input box and submit button
guess = st.text_input("Guess a 4-digit number (0000-9999):", max_chars=4)

if st.button("Check Guess"):
    # 3. Validate input
    if not (guess.isascii() and guess.isdigit() and len(guess) == 4):
        st.error("Invalid input. Please enter exactly 4 digits.")
    else:
        # 4. Count correct digits in the exact same position
        secret = st.session_state.secret_number
        correct_count = 0
        for i in range(4):
            if guess[i] == secret[i]:
                correct_count += 1

        # 5. Show result
        if correct_count == 4:
            st.success(f"Congratulations! You guessed the secret number: {secret}")
            st.session_state.game_over = True
        else:
            st.info(f"Correct digits in the right spot: **{correct_count}**")

# 6. Play Again button once the user wins
if st.session_state.game_over:
    if st.button("Play Again"):
        st.session_state.secret_number = f"{random.randint(0, 9999):04d}"
        st.session_state.game_over = False
        st.rerun()
