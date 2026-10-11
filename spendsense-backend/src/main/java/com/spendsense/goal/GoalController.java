
package com.spendsense.goal;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalRepository repository;

    public GoalController(GoalRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Goal> getAll(@RequestParam String userEmail) {
        return repository.findByUserEmailOrderByIdDesc(
            normalizeEmail(userEmail)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Goal create(@Valid @RequestBody Goal goal) {
        goal.setId(null);
        goal.setUserEmail(normalizeEmail(goal.getUserEmail()));
        return repository.save(goal);
    }

    @PutMapping("/{id}")
    public Goal update(
            @PathVariable Long id,
            @RequestParam String userEmail,
            @Valid @RequestBody Goal input) {

        Goal existing = findOwned(id, userEmail);

        existing.setName(input.getName());
        existing.setTarget(input.getTarget());
        existing.setSaved(input.getSaved());

        return repository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long id,
            @RequestParam String userEmail) {
        repository.delete(findOwned(id, userEmail));
    }

    private Goal findOwned(Long id, String email) {
        String normalized = normalizeEmail(email);

        Goal goal = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Goal not found"
            ));

        if (!goal.getUserEmail().equals(normalized)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Goal not found"
            );
        }

        return goal;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()
                || !email.contains("@")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "A valid userEmail is required"
            );
        }

        return email.trim().toLowerCase();
    }
}
